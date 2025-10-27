import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Zap, 
  ArrowLeft, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Shield, 
  Brain,
  Download,
  Share2
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function Story() {
  const params = useParams<{ id: string }>();
  const ritualId = params.id || "";

  const { data: story, isLoading } = trpc.stories.getByRitualId.useQuery(
    { ritualId },
    { enabled: !!ritualId }
  );
  const { data: ucfTrajectory } = trpc.stories.getUcfTrajectory.useQuery(
    { ritualId: story?.ritualId || "" },
    { enabled: !!story?.ritualId }
  );
  const { data: agentLogs } = trpc.stories.getAgentLogs.useQuery(
    { ritualId: story?.ritualId || "" },
    { enabled: !!story?.ritualId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Zap className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center space-y-4">
          <h2 className="text-2xl font-bold">Story Not Found</h2>
          <p className="text-muted-foreground">The requested story could not be found.</p>
          <Button asChild>
            <Link href="/archive">Back to Archive</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const agentContributions = Array.isArray(story.agentContributions) 
    ? story.agentContributions 
    : JSON.parse(story.agentContributions || "[]");

  const handleDownload = () => {
    const blob = new Blob([story.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold glow-cyan">Helix Creative Studio</span>
            </a>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/generate">
              <a className="text-sm hover:text-primary transition-colors">Generate</a>
            </Link>
            <Link href="/archive">
              <a className="text-sm hover:text-primary transition-colors">Archive</a>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back Button */}
          <Link href="/archive">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Archive
            </Button>
          </Link>

          {/* Story Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">{story.title}</h1>
            
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">
                <FileText className="w-3 h-3 mr-1" />
                {story.wordCount} words
              </Badge>
              <Badge variant="outline">
                <TrendingUp className="w-3 h-3 mr-1" />
                Quality {(story.qualityScore * 100).toFixed(0)}%
              </Badge>
              {story.ethicalApproval && (
                <Badge variant="outline" className="text-green-400">
                  <Shield className="w-3 h-3 mr-1" />
                  Ethically Approved
                </Badge>
              )}
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(story.createdAt).toLocaleDateString()}
              </Badge>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="story" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="story">Story</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="agents">Agent Logs</TabsTrigger>
            </TabsList>

            {/* Story Content */}
            <TabsContent value="story">
              <Card className="p-8">
                <div className="prose prose-invert max-w-none">
                  <div className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border/50">
                    <strong>Prompt:</strong> {story.prompt}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {story.content}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Metadata */}
            <TabsContent value="metadata">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    UCF Snapshot
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Harmony</span>
                      <span className="font-mono text-primary">{story.ucfHarmony.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Prana</span>
                      <span className="font-mono text-secondary">{story.ucfPrana.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Drishti</span>
                      <span className="font-mono text-accent">{story.ucfDrishti.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Klesha</span>
                      <span className="font-mono">{story.ucfKlesha.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Resilience</span>
                      <span className="font-mono">{story.ucfResilience.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Zoom</span>
                      <span className="font-mono">{story.ucfZoom.toFixed(4)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h3 className="text-lg font-bold">Agent Contributions</h3>
                  <div className="space-y-2">
                    {agentContributions.map((agent: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>{agent}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {ucfTrajectory && ucfTrajectory.length > 0 && (
                  <Card className="p-6 space-y-4 md:col-span-2">
                    <h3 className="text-lg font-bold">UCF Trajectory</h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Showing {ucfTrajectory.length} consciousness state snapshots during ritual execution
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {ucfTrajectory.slice(0, 6).map((state, index) => (
                          <div key={index} className="p-3 rounded border border-border/50 bg-card/50">
                            <div className="font-medium mb-1">Step {state.step}</div>
                            <div className="space-y-1 text-muted-foreground">
                              <div>H: {state.harmony.toFixed(3)}</div>
                              <div>P: {state.prana.toFixed(3)}</div>
                              <div>D: {state.drishti.toFixed(3)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Agent Logs */}
            <TabsContent value="agents">
              <div className="space-y-4">
                {agentLogs && agentLogs.length > 0 ? (
                  agentLogs.map((log, index) => (
                    <Card key={index} className="p-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{log.agentSymbol}</span>
                        <div>
                          <h4 className="font-bold">{log.agentName}</h4>
                          <p className="text-sm text-muted-foreground">{log.role}</p>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed border-t border-border/50 pt-3">
                        {log.content}
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No agent logs available</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

