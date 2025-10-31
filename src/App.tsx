import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { RecipeGenerator, type Recipe } from './components/RecipeGenerator';
import { QuizGenerator } from './components/QuizGenerator';
import ChatGenerator from './components/ChatGenerator';
import { ChefHat, BookOpen, MessageCircle } from 'lucide-react';
import { useIsMobile } from './components/ui/use-mobile';

export default function App() {
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className={`text-orange-500 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`} />
            <h1 className={`font-bold text-orange-600 ${isMobile ? 'text-3xl' : 'text-4xl'}`}>CookLingo</h1>
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
          <TabsList 
            className={`w-full mb-8 bg-muted text-muted-foreground rounded-xl ${isMobile ? 'flex flex-col items-center p-2' : 'grid'}`}
            style={isMobile ? {} : { gridTemplateColumns: 'repeat(3, 1fr)' }}
          >
            <TabsTrigger value="recipe" className="flex items-center gap-2 w-full max-w-xs">
              <ChefHat className="w-4 h-4" />
              Recipe Suggestion
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2 w-full max-w-xs">
              <BookOpen className="w-4 h-4" />
              Vocabulary Quiz
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2 w-full max-w-xs">
              <MessageCircle className="w-4 h-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipe">
            <RecipeGenerator onRecipeGenerated={setCurrentRecipe} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizGenerator />
          </TabsContent>

          <TabsContent value="chat">
            <ChatGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
