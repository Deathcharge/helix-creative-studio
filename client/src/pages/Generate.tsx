import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Sparkles, Zap, ArrowLeft, Loader2, Wand2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { AgentConfigurator, type AgentSelection } from "@/components/AgentConfigurator";

export default function Generate() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [enhancedData, setEnhancedData] = React.useState<any>(null);

  const enhanceMutation = trpc.prompts.enhance.useMutation({
    onSuccess: (data) => {
      setEnhancedData(data);
      setPrompt(data.enhanced);
      setIsEnhancing(false);
    },
    onError: () => {
      setIsEnhancing(false);
    },
  });
  const [generationConfig, setGenerationConfig] = React.useState<{
    preset?: string;
    customAgents?: AgentSelection[];
  }>({ preset: "balanced" });

  // Fetch agent and preset configurations
  const { data: agents } = trpc.config.agents.useQuery();
  const { data: presets } = trpc.config.presets.useQuery();

  const generateMutation = trpc.stories.generate.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      setProgress(100);
      setStatusMessage("Story complete!");
      // Navigate to the story detail page using ritualId
      setTimeout(() => {
        setLocation(`/story/${data.ritualId}`);
      }, 1000);
    },
    onError: (error) => {
      setIsGenerating(false);
      setStatusMessage(`Error: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim() || prompt.length < 10) {
      setStatusMessage("Please enter a prompt (at least 10 characters)");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Initializing Z-88 Ritual Engine...");

    // More realistic progress simulation with variable speed
    let currentProgress = 0;
    const progressSteps = [
      { progress: 10, delay: 1000, message: "Phase 1: Invocation & Intent Setting" },
      { progress: 20, delay: 2000, message: "Phase 2: Agent Roll Call" },
      { progress: 35, delay: 3000, message: "Phase 3: Invoking Oracle (Plot Architect)" },
      { progress: 45, delay: 3000, message: "Phase 3: Invoking Lumina (Character Psychologist)" },
      { progress: 55, delay: 3000, message: "Phase 3: Invoking Gemini (World-Builder)" },
      { progress: 65, delay: 3000, message: "Phase 3: Invoking Agni (Creative Catalyst)" },
      { progress: 75, delay: 4000, message: "Phase 4: Synthesizing story with Manus" },
      { progress: 85, delay: 3000, message: "Phase 4: Quality assessment with Claude" },
      { progress: 92, delay: 2000, message: "Phase 4: Ethical scan with Kavach" },
      { progress: 98, delay: 1000, message: "Finalizing story..." },
    ];

    let stepIndex = 0;
    const runNextStep = () => {
      if (stepIndex < progressSteps.length && isGenerating) {
        const step = progressSteps[stepIndex];
        setProgress(step.progress);
        setStatusMessage(step.message);
        stepIndex++;
        setTimeout(runNextStep, step.delay);
      }
    };

    setTimeout(runNextStep, 1000);
    generateMutation.mutate({ 
      prompt,
      preset: generationConfig.preset,
      customAgents: generationConfig.customAgents,
    });
  };

  const examplePrompts = [
    "A hacker discovers their memories are corporate property and must steal them back",
    "An AI detective investigates murders in a city where consciousness can be uploaded",
    "A street samurai protects a child who can see through augmented reality illusions",
    "A memory trader finds a black market chip containing the last human emotion",
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
          <div className="container flex items-center justify-between h-16">
            <Link href="/">
              <a className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold glow-cyan">Helix Creative Studio</span>
              </a>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <Card className="p-12 max-w-md text-center space-y-6">
            <Sparkles className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Sign In Required</h2>
            <p className="text-muted-foreground">
              Please sign in to generate stories with the Z-88 Creative Engine.
            </p>
            <Button asChild size="lg" className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold glow-cyan">Helix Creative Studio</span>
            </a>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/generate">
              <a className="text-sm text-primary font-medium">Generate</a>
            </Link>
            <Link href="/archive">
              <a className="text-sm hover:text-primary transition-colors">Archive</a>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Generate Story</h1>
              <p className="text-muted-foreground mt-1">
                Enter a prompt to begin the Z-88 creative ritual
              </p>
            </div>
          </div>

          {/* Prompt Input */}
          <Card className="p-6 space-y-4 border-glow">
            <div className="space-y-2">
              <label className="text-sm font-medium">Story Prompt</label>
              <Textarea
                placeholder="A hacker discovers their memories are corporate property..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                disabled={isGenerating}
                className="resize-none"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {prompt.length} / 1000 characters (minimum 10)
                </p>
                {prompt.length > 0 && prompt.length < 100 && (
                  <button
                    onClick={() => {
                      setIsEnhancing(true);
                      enhanceMutation.mutate({ prompt });
                    }}
                    disabled={isEnhancing || isGenerating}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        Auto-enhance prompt
                      </>
                    )}
                  </button>
                )}
              </div>
              {enhancedData && (
                <div className="text-xs p-3 bg-primary/5 border border-primary/20 rounded space-y-1">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Sparkles className="w-3 h-3" />
                    Enhanced Prompt Applied
                  </div>
                  <div className="text-muted-foreground">
                    Genre: {enhancedData.detectedGenre} • Tone: {enhancedData.detectedTone}
                  </div>
                  {enhancedData.suggestedThemes.length > 0 && (
                    <div className="text-muted-foreground">
                      Themes: {enhancedData.suggestedThemes.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agent Configurator */}
            {agents && presets && (
              <AgentConfigurator
                agents={agents}
                presets={presets}
                onConfigChange={setGenerationConfig}
              />
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || prompt.length < 10}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          </Card>

          {/* Progress Display */}
          {isGenerating && (
            <Card className="p-6 space-y-4 border-primary/50">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{statusMessage}</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>🔮 Oracle: Designing plot structure...</p>
                <p>🌸 Lumina: Developing character arcs...</p>
                <p>🎭 Gemini: Building cyberpunk world...</p>
                <p>🔥 Agni: Injecting creative twists...</p>
              </div>
            </Card>
          )}

          {/* Example Prompts */}
          {!isGenerating && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Example Prompts</h3>
              <div className="grid gap-3">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="text-left p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-card/50 transition-all text-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

