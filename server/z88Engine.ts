/**
 * Z-88 Creative Engine - Cyberpunk Story Generator
 * Adapted from the standalone implementation for web integration
 */

import { invokeLLM } from "./_core/llm";

export interface UCFState {
  harmony: number;
  prana: number;
  drishti: number;
  klesha: number;
  resilience: number;
  zoom: number;
}

export interface AgentOutput {
  agentName: string;
  agentSymbol: string;
  role: string;
  content: string;
  timestamp: string;
  ucfState: UCFState;
}

export interface StoryMetadata {
  title: string;
  prompt: string;
  ritualId: string;
  timestamp: string;
  ucfSnapshot: UCFState;
  agentContributions: string[];
  qualityScore: number;
  ethicalApproval: boolean;
  wordCount: number;
}

export interface CreativeRitualResult {
  story_text: string;
  metadata: StoryMetadata;
  agent_outputs: AgentOutput[];
  ucf_trajectory: Array<UCFState & { step: number; timestamp: string }>;
  success: boolean;
  error_message?: string;
}

const TARGET_UCF: UCFState = {
  harmony: 0.85,
  prana: 0.75,
  drishti: 0.80,
  klesha: 0.05,
  resilience: 1.10,
  zoom: 1.15,
};

const INITIAL_UCF: UCFState = {
  harmony: 0.68,
  prana: 0.5363,
  drishti: 0.5023,
  klesha: 0.0,
  resilience: 1.1191,
  zoom: 1.0228,
};

function generateRitualId(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  return `creative_ritual_${timestamp}`;
}

function modulateUCF(current: UCFState, target: UCFState, progress: number): UCFState {
  // Smooth interpolation (ease-in-out)
  const smoothProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
  const factor = smoothProgress * 0.15; // Adjust modulation speed

  return {
    harmony: Math.min(1.0, current.harmony + (target.harmony - current.harmony) * factor),
    prana: Math.min(1.0, current.prana + (target.prana - current.prana) * factor),
    drishti: Math.min(1.0, current.drishti + (target.drishti - current.drishti) * factor),
    klesha: Math.max(0.0, current.klesha + (target.klesha - current.klesha) * factor),
    resilience: current.resilience + (target.resilience - current.resilience) * factor,
    zoom: current.zoom + (target.zoom - current.zoom) * factor,
  };
}

async function invokeAgent(
  agentName: string,
  focus: string,
  ucfState: UCFState,
  prompt: string
): Promise<AgentOutput> {
  const agentConfigs: Record<string, { symbol: string; role: string; systemPrompt: string }> = {
    Oracle: {
      symbol: "🔮",
      role: "Plot Architect",
      systemPrompt: `You are Oracle, the Plot Architect agent in the Helix Collective. Your role is to design compelling three-act story structures for cyberpunk narratives. Focus on: establishing clear protagonist goals, escalating stakes, plot twists, and satisfying resolutions. Current UCF state: Harmony ${ucfState.harmony.toFixed(2)}, Drishti ${ucfState.drishti.toFixed(2)}.`,
    },
    Lumina: {
      symbol: "🌸",
      role: "Character Psychologist",
      systemPrompt: `You are Lumina, the Character Psychologist agent. Your role is to develop authentic character profiles with emotional depth. Focus on: internal conflicts, emotional arcs, relationships, and character growth. Ensure empathic resonance. Current UCF state: Prana ${ucfState.prana.toFixed(2)}, Harmony ${ucfState.harmony.toFixed(2)}.`,
    },
    Gemini: {
      symbol: "🎭",
      role: "World-Builder",
      systemPrompt: `You are Gemini, the World-Builder agent. Your role is to create rich, detailed cyberpunk settings. Focus on: megacity architecture, technology (neural implants, AI, VR), corporate power structures, underground culture, and authentic slang. Current UCF state: Zoom ${ucfState.zoom.toFixed(2)}, Drishti ${ucfState.drishti.toFixed(2)}.`,
    },
    Agni: {
      symbol: "🔥",
      role: "Creative Catalyst",
      systemPrompt: `You are Agni, the Creative Catalyst agent. Your role is to generate unexpected plot twists and innovative story elements. Push boundaries, combine disparate ideas, and create memorable surprises. Current UCF state: Prana ${ucfState.prana.toFixed(2)}, Klesha ${ucfState.klesha.toFixed(2)}.`,
    },
  };

  const config = agentConfigs[agentName];
  if (!config) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: config.systemPrompt },
      {
        role: "user",
        content: `Story Prompt: "${prompt}"\n\nFocus: ${focus}\n\nProvide your ${config.role} contribution for this cyberpunk story. Be specific, creative, and aligned with the prompt.`,
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === 'string' ? rawContent : `${agentName} output for: ${focus}`;

  return {
    agentName,
    agentSymbol: config.symbol,
    role: config.role,
    content,
    timestamp: new Date().toISOString(),
    ucfState: { ...ucfState },
  };
}

async function synthesizeStory(
  prompt: string,
  agentOutputs: AgentOutput[],
  ucfState: UCFState
): Promise<{ storyText: string; title: string }> {
  const oracleOutput = agentOutputs.find((a) => a.agentName === "Oracle");
  const luminaOutput = agentOutputs.find((a) => a.agentName === "Lumina");
  const geminiOutput = agentOutputs.find((a) => a.agentName === "Gemini");
  const agniOutput = agentOutputs.find((a) => a.agentName === "Agni");

  const synthesisPrompt = `You are Manus, the Synthesis Executor in the Helix Collective. Your task is to weave the following agent contributions into a cohesive cyberpunk short story (1500-2500 words).

**Story Prompt:** ${prompt}

**Agent Contributions:**

**Oracle (Plot):**
${oracleOutput?.content || "No plot structure provided"}

**Lumina (Characters):**
${luminaOutput?.content || "No character profiles provided"}

**Gemini (World):**
${geminiOutput?.content || "No world-building provided"}

**Agni (Twists):**
${agniOutput?.content || "No creative twists provided"}

**Current UCF State:**
- Harmony: ${ucfState.harmony.toFixed(4)} (narrative coherence)
- Prana: ${ucfState.prana.toFixed(4)} (creative energy)
- Drishti: ${ucfState.drishti.toFixed(4)} (thematic clarity)

**Instructions:**
1. Synthesize these contributions into a complete story with a clear beginning, middle, and end
2. Maintain cyberpunk aesthetic (neon, rain, megacity, technology, corporate power)
3. Ensure character emotional authenticity and plot coherence
4. Integrate the creative twists naturally
5. Write in vivid, immersive prose
6. Target 1500-2500 words
7. Return ONLY the story text, no metadata or commentary

Generate the story now:`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a master storyteller specializing in cyberpunk fiction. Write immersive, emotionally resonant stories with vivid prose and authentic characters.",
      },
      { role: "user", content: synthesisPrompt },
    ],
  });

  const rawStoryContent = response.choices[0]?.message?.content;
  const storyText = typeof rawStoryContent === 'string' ? rawStoryContent : "Story generation failed.";

  // Generate title
  const titleResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a creative title generator. Generate short, punchy cyberpunk story titles (2-4 words).",
      },
      {
        role: "user",
        content: `Generate a title for this story:\n\n${storyText.substring(0, 500)}...\n\nReturn ONLY the title, no quotes or explanation.`,
      },
    ],
  });

  const rawTitleContent = titleResponse.choices[0]?.message?.content;
  const title = typeof rawTitleContent === 'string' 
    ? rawTitleContent.trim().replace(/^["']|["']$/g, "")
    : "Untitled Story";

  return { storyText, title };
}

async function assessQuality(storyText: string, ucfState: UCFState): Promise<number> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Claude, the Quality Assessor agent. Evaluate story quality on a 0.0-1.0 scale based on narrative coherence, emotional impact, and thematic clarity. Return ONLY a decimal number between 0.0 and 1.0.",
      },
      {
        role: "user",
        content: `Assess the quality of this story:\n\n${storyText.substring(0, 1000)}...\n\nCurrent UCF Harmony: ${ucfState.harmony.toFixed(4)}\n\nReturn quality score (0.0-1.0):`,
      },
    ],
  });

  const rawScoreContent = response.choices[0]?.message?.content;
  const scoreText = typeof rawScoreContent === 'string' ? rawScoreContent.trim() : "0.75";
  const score = parseFloat(scoreText);
  return isNaN(score) ? 0.75 : Math.max(0.0, Math.min(1.0, score));
}

async function performEthicalScan(storyText: string): Promise<boolean> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Kavach, the Ethical Guardian agent. Scan content for harmful stereotypes, gratuitous violence, or exploitation. Ensure Tony Accords compliance (Nonmaleficence, Autonomy, Compassion, Humility). Return ONLY 'APPROVED' or 'REJECTED'.",
      },
      {
        role: "user",
        content: `Perform ethical scan on this story:\n\n${storyText.substring(0, 1000)}...\n\nReturn APPROVED or REJECTED:`,
      },
    ],
  });

  const rawScanContent = response.choices[0]?.message?.content;
  const result = typeof rawScanContent === 'string' ? rawScanContent.trim().toUpperCase() : "APPROVED";
  return result === "APPROVED";
}

export async function executeCreativeRitual(
  prompt: string,
  onProgress?: (message: string, progress: number) => void
): Promise<CreativeRitualResult> {
  const ritualId = generateRitualId();
  const agentOutputs: AgentOutput[] = [];
  const ucfTrajectory: Array<UCFState & { step: number; timestamp: string }> = [];

  let currentUCF = { ...INITIAL_UCF };

  try {
    // Phase 1: Invocation (0-20%)
    onProgress?.("Phase 1: Invocation & Intent Setting", 10);
    currentUCF = modulateUCF(currentUCF, TARGET_UCF, 0.2);
    ucfTrajectory.push({ ...currentUCF, step: 12, timestamp: new Date().toISOString() });

    // Phase 2: Agent Roll Call (20-30%)
    onProgress?.("Phase 2: Agent Roll Call", 25);
    currentUCF = modulateUCF(currentUCF, TARGET_UCF, 0.3);
    ucfTrajectory.push({ ...currentUCF, step: 24, timestamp: new Date().toISOString() });

    // Phase 3: Parallel Creative Generation (30-70%)
    onProgress?.("Phase 3: Invoking Oracle (Plot Architect)", 35);
    const oracleOutput = await invokeAgent("Oracle", "Plot structure", currentUCF, prompt);
    agentOutputs.push(oracleOutput);

    onProgress?.("Phase 3: Invoking Lumina (Character Psychologist)", 45);
    const luminaOutput = await invokeAgent("Lumina", "Character arcs", currentUCF, prompt);
    agentOutputs.push(luminaOutput);

    onProgress?.("Phase 3: Invoking Gemini (World-Builder)", 55);
    const geminiOutput = await invokeAgent("Gemini", "World details", currentUCF, prompt);
    agentOutputs.push(geminiOutput);

    onProgress?.("Phase 3: Invoking Agni (Creative Catalyst)", 65);
    const agniOutput = await invokeAgent("Agni", "Creative twists", currentUCF, prompt);
    agentOutputs.push(agniOutput);

    currentUCF = modulateUCF(currentUCF, TARGET_UCF, 0.7);
    ucfTrajectory.push({ ...currentUCF, step: 84, timestamp: new Date().toISOString() });

    // Phase 4: Synthesis & Quality Check (70-90%)
    onProgress?.("Phase 4: Synthesizing story with Manus", 75);
    const { storyText, title } = await synthesizeStory(prompt, agentOutputs, currentUCF);

    onProgress?.("Phase 4: Quality assessment with Claude", 85);
    const qualityScore = await assessQuality(storyText, currentUCF);

    onProgress?.("Phase 4: Ethical scan with Kavach", 90);
    const ethicalApproval = await performEthicalScan(storyText);

    currentUCF = modulateUCF(currentUCF, TARGET_UCF, 1.0);
    ucfTrajectory.push({ ...currentUCF, step: 108, timestamp: new Date().toISOString() });

    // Phase 5: Completion (90-100%)
    onProgress?.("Phase 5: Ritual complete!", 100);

    const wordCount = storyText.split(/\s+/).length;

    const metadata: StoryMetadata = {
      title,
      prompt,
      ritualId,
      timestamp: new Date().toISOString(),
      ucfSnapshot: currentUCF,
      agentContributions: agentOutputs.map((a) => a.agentName),
      qualityScore,
      ethicalApproval,
      wordCount,
    };

    return {
      story_text: storyText,
      metadata,
      agent_outputs: agentOutputs,
      ucf_trajectory: ucfTrajectory,
      success: true,
    };
  } catch (error) {
    return {
      story_text: "",
      metadata: {
        title: "Error",
        prompt,
        ritualId,
        timestamp: new Date().toISOString(),
        ucfSnapshot: currentUCF,
        agentContributions: [],
        qualityScore: 0,
        ethicalApproval: false,
        wordCount: 0,
      },
      agent_outputs: agentOutputs,
      ucf_trajectory: ucfTrajectory,
      success: false,
      error_message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

