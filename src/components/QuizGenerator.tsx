import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { toast } from 'sonner';
import { Loader2, BrainCircuit, Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';

// Difyから返されるクイズの型定義
interface QuizItem {
  question: string;
  choices: string[];
  correct_answer_index: number;
}

interface QuizData {
  quiz: QuizItem[];
}

// DBから取得する単語の型定義
interface Word {
  id: number;
  word: string;
  translation: string;
  recognition: number;
  frequency: number;
  simplicity: number;
}

export function QuizGenerator() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [difficulty, setDifficulty] = useState<'basic' | 'advanced'>('basic');

  useEffect(() => {
    if (loading) {
      setProgress(10);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const DIFY_API_KEY = (import.meta as any).env.VITE_QUIZ_GENERATOR_ID;
  const DIFY_WORKFLOW_URL = (import.meta as any).env.VITE_DIFY_BASE_URL;

  const generateQuiz = async () => {
    setLoading(true);
    setQuizData(null);
    setUserAnswers([]);
    setShowResults(false);

    try {
      // 1. Supabaseから単語を取得
      const { data: allWords, error: fetchError } = await supabase
        .from('words')
        .select('id, word, translation, recognition, frequency, simplicity');

      if (fetchError || !allWords) {
        throw new Error('Failed to fetch words from database.');
      }

      // 2. 難易度で単語をフィルタリング
      const filteredWords = allWords.filter(word => {
        const score = (word.recognition || 0) + (word.frequency || 0) + (word.simplicity || 0);
        if (difficulty === 'basic') {
          return score >= 12;
        } else { // advanced
          return score <= 11;
        }
      });

      if (filteredWords.length < 5) {
        toast.warning(`Not enough ${difficulty} words to generate a quiz. Please add more words.`);
        setLoading(false);
        return;
      }

      // 3. フィルタリングされた単語からランダムに5つ選択
      const selectedWords = filteredWords.sort(() => 0.5 - Math.random()).slice(0, 5);

      const wordList = selectedWords.map((w: Word) => `${w.word} (${w.translation})`).join('\n');

      // 2. Dify APIを呼び出してクイズを生成
      const response = await fetch(DIFY_WORKFLOW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIFY_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: {
            word_list: wordList,
          },
          response_mode: 'blocking',
          user: 'gemini-cli-user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz from Dify API');
      }

      const result = await response.json();
      
      // Difyの出力キー 'quiz' を直接参照します
      if (result && result.data && result.data.outputs && result.data.outputs.quiz) {
        let generatedQuiz = result.data.outputs.quiz;
        // Difyの出力が文字列化されたJSONの場合も考慮します。
        if (typeof generatedQuiz === 'string') {
          try {
            generatedQuiz = JSON.parse(generatedQuiz);
          } catch (e) {
            console.error("Failed to parse quiz JSON string:", e);
            throw new Error("Failed to parse quiz from Dify response.");
          }
        }

        // Shuffle choices for each question
        generatedQuiz.quiz.forEach((item: QuizItem) => {
            const correctAnswer = item.choices[item.correct_answer_index];
            item.choices.sort(() => Math.random() - 0.5);
            item.correct_answer_index = item.choices.indexOf(correctAnswer);
        });

        setQuizData(generatedQuiz);
      } else {
        throw new Error('Unexpected API response structure from Dify.');
      }

      toast.success('Quiz generated successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, choiceIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = choiceIndex;
    setUserAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (userAnswers.filter(a => a !== undefined).length !== quizData?.quiz.length) {
        toast.warning('Please answer all questions.');
        return;
    }
    setShowResults(true);
  };

  const getChoiceVariant = (questionIndex: number, choiceIndex: number): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    if (!showResults) {
        return userAnswers[questionIndex] === choiceIndex ? 'secondary' : 'outline';
    }
    const isCorrect = quizData!.quiz[questionIndex].correct_answer_index === choiceIndex;
    if (isCorrect) return 'success';

    const isUserChoice = userAnswers[questionIndex] === choiceIndex;
    if (isUserChoice) return 'destructive';

    return 'outline';
  }

  const score = quizData?.quiz.reduce((acc, question, index) => {
    return acc + (question.correct_answer_index === userAnswers[index] ? 1 : 0);
  }, 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-blue-500" />
                Vocabulary Quiz
            </CardTitle>
            <div className="flex items-center gap-2">
                <label htmlFor="difficulty-select" className="text-sm text-gray-600">Difficulty:</label>
                <Select value={difficulty} onValueChange={(value: 'basic' | 'advanced') => setDifficulty(value)}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <Button onClick={generateQuiz} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> New Quiz</>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
            <div className="flex flex-col items-center justify-center py-12">
                <p className="mb-4 text-gray-600">Generating your personalized quiz...</p>
                <Progress value={progress} className="w-3/4" />
            </div>
        )}
        {!loading && quizData && (
          <div className="space-y-6">
            {quizData.quiz.map((item, qIndex) => (
              <div key={qIndex}>
                <p className="font-semibold mb-3">{qIndex + 1}. {item.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {item.choices.map((choice, cIndex) => (
                    <Button
                      key={cIndex}
                      variant={getChoiceVariant(qIndex, cIndex)}
                      onClick={() => handleAnswerSelect(qIndex, cIndex)}
                      disabled={showResults}
                      className="justify-start p-6 text-left h-auto whitespace-normal"
                    >
                      {choice}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            
            {!showResults ? (
                <Button onClick={handleSubmitQuiz} className="w-full mt-6">Check Answers</Button>
            ) : (
                <div className="text-center mt-8 p-4 bg-gray-100 rounded-lg">
                    <h3 className="text-xl font-bold">Results</h3>
                    <p className="text-2xl font-semibold">You scored {score} out of {quizData.quiz.length}</p>
                </div>
            )}
          </div>
        )}
        {!loading && !quizData && (
            <div className="text-center text-gray-500 py-12">
                <p>Click "New Quiz" to start!</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}