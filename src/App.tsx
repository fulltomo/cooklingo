import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { RecipeGenerator, type Recipe } from './components/RecipeGenerator';
import { QuizGenerator } from './components/QuizGenerator';
import { ChefHat, BookOpen } from 'lucide-react';

export default function App() {
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className="w-10 h-10 text-orange-500" />
            <h1 className="text-orange-600">CookLingo</h1>
          </div>
          <p className="text-gray-600">
            Learn English while discovering delicious recipes!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            一人暮らしの大学生のための英語学習×献立提案アプリ
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="recipe" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="recipe" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Recipe Suggestion
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Vocabulary Quiz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipe">
            <RecipeGenerator onRecipeGenerated={setCurrentRecipe} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
