import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Clock, TrendingUp, ChefHat, Lightbulb, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

interface Vocabulary {
  word: string;
  translation: string;
  partOfSpeech: string;
}

interface Recipe {
  dish: string;
  cookingTime: string;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  vocabulary: Vocabulary[];
  tips: string[];
}

export function RecipeGenerator({ onRecipeGenerated }: { onRecipeGenerated: (recipe: Recipe | null) => void }) {
  const [dishInput, setDishInput] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  // ワークフローごとにAPIキーとIDを環境変数から取得
  const RECIPE_WORKFLOW_ID = (import.meta as any).env.VITE_RECIPE_GENERATOR_ID;
  const DIFY_BASE_URL = (import.meta as any).env.VITE_DIFY_BASE_URL;

  const generateRecipe = async (dish: string): Promise<Recipe> => {
    const response = await fetch(DIFY_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RECIPE_WORKFLOW_ID}`
      },
      body: JSON.stringify({
        "inputs": {
          "recipe_name": dish
        },
        "response_mode": "blocking",
        "user": "gemini-cli-user"
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipe from Dify');
    }

    const result = await response.json();
    // Difyのワークフローで設定したJSON出力のキーを 'json' と仮定しています。
    // 必要に応じて実際のキーに修正してください。
    if (result && result.data && result.data.outputs && result.data.outputs.json) {
      let recipeData = result.data.outputs.json;
      // Difyの出力が文字列化されたJSONの場合も考慮します。
      if (typeof recipeData === 'string') {
        try {
          return JSON.parse(recipeData);
        } catch (e) {
          console.error("Failed to parse recipe JSON string:", e);
          throw new Error("Failed to parse recipe from Dify response.");
        }
      }
      return recipeData;
    } else {
      console.error("Unexpected Dify API response structure for JSON output:", result);
      throw new Error("Failed to get structured recipe from Dify response.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishInput.trim()) {
      toast.error('Please enter a dish name');
      return;
    }

    setLoading(true);
    try {
      const generatedRecipe = await generateRecipe(dishInput);
      setRecipe(generatedRecipe);
      onRecipeGenerated(generatedRecipe);
      await saveRecipe(generatedRecipe); // Save the recipe to Supabase
      toast.success('Recipe generated successfully!');
    } catch (error) {
      toast.error('Failed to generate recipe');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    try {
      // 1. Save the recipe text
      const recipeText = JSON.stringify(recipe);
      const { error: recipeError } = await supabase
        .from('recipes')
        .insert({ recipe_text: recipeText });

      if (recipeError) {
        throw recipeError;
      }
      toast.success('Recipe saved to your history!');

      // 2. Save the unique words from the recipe
      if (recipe.vocabulary && recipe.vocabulary.length > 0) {
        const wordsToUpsert = recipe.vocabulary.map(v => ({
          word: v.word,
          translation: v.translation,
        }));

        // Upsert the words. If a word already exists, it will be ignored.
        const { error: wordsError } = await supabase
          .from('words')
          .upsert(wordsToUpsert, { onConflict: 'word' });

        if (wordsError) {
          // Log the error but don't show a toast, as the main recipe save was successful.
          console.error('Error upserting words:', wordsError);
        }
      }
    } catch (error) {
      console.error('Error saving recipe to Supabase:', error);
      toast.error('Could not save recipe to history.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPartOfSpeechColor = (pos: string) => {
    switch (pos.toLowerCase()) {
      case 'verb':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'noun':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'adjective':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'adverb':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What would you like to cook?</CardTitle>
          <CardDescription>
            Enter a dish name and get an English recipe with vocabulary!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="e.g., カレーライス, オムライス, パスタ..."
              value={dishInput}
              onChange={(e: { target: { value: any; }; }) => setDishInput(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {recipe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ChefHat className="w-6 h-6 text-orange-500" />
              {recipe.dish}
            </CardTitle>
            <div className="flex gap-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {recipe.cookingTime}
              </div>
              <Badge className={getDifficultyColor(recipe.difficulty)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {recipe.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ingredients */}
            <div>
              <h3 className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Ingredients (1 serving)
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient: any, index: any) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Steps */}
            <div>
              <h3 className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Instructions
              </h3>
              <ol className="space-y-3">
                {recipe.steps.map((step: any, index: number) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />

            {/* Vocabulary */}
            <div>
              <h3 className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-purple-500" />
                Key Vocabulary
              </h3>
              <div className="space-y-3">
                {recipe.vocabulary.map((vocab: { partOfSpeech: string; word: any; translation: any; }, index: any) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <Badge className={getPartOfSpeechColor(vocab.partOfSpeech)}>
                      {vocab.partOfSpeech}
                    </Badge>
                    <div className="flex-1">
                      <span className="text-purple-900">{vocab.word}</span>
                      <span className="text-gray-600 ml-3">= {vocab.translation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tips */}
            <div>
              <h3 className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Cooking Tips
              </h3>
              <ul className="space-y-2">
                {recipe.tips.map((tip: any, index: any) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 p-2 bg-yellow-50 rounded border border-yellow-100">
                    <span className="text-yellow-600 mt-0.5">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
