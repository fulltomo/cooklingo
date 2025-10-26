import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Loader2, BrainCircuit, Sparkles } from 'lucide-react';

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
}

export function QuizGenerator() {
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const DIFY_API_KEY = 'app-6yVOqysHPGOIH3oQgSFQ9cck';
  const DIFY_WORKFLOW_URL = 'https://api.dify.ai/v1/workflows/run';

  const generateQuiz = async () => {
    setLoading(true);
    setQuizData(null);
    setUserAnswers([]);
    setShowResults(false);

    try {
      // 1. Supabaseからランダムに5つの単語を取得
      const { data: words, error: rpcError } = await supabase.rpc('get_random_words', {
        limit_count: 5,
      });

      if (rpcError || !words || words.length < 5) {
        throw new Error('Failed to fetch random words from database.');
      }

      const wordList = words.map((w: Word) => `${w.word} (${w.translation})`).join('\n');

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
      console.log("Dify API response:", JSON.stringify(result, null, 2));
      
      // Difyの出力キー 'quiz' を直接参照します
      if (result && result.data && result.data.outputs && result.data.outputs.quiz) {
        const generatedQuiz = result.data.outputs.quiz;
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

  const getChoiceVariant = (questionIndex: number, choiceIndex: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!showResults) {
        return userAnswers[questionIndex] === choiceIndex ? 'secondary' : 'outline';
    }
    const isCorrect = quizData!.quiz[questionIndex].correct_answer_index === choiceIndex;
    if (isCorrect) return 'default';

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
        {quizData && (
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