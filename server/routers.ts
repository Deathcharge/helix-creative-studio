import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getAllAgentConfigs, getAllPresetModes } from "./agentConfig";
import { testAllProviders } from "./llmRouter";
import { z } from "zod";
import * as db from "./db";
import { executeCreativeRitual } from "./z88Engine";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  config: router({    agents: publicProcedure.query(() => getAllAgentConfigs()),
    presets: publicProcedure.query(() => getAllPresetModes()),
    testProviders: publicProcedure.query(async () => await testAllProviders()),
  }),

  stories: router({
    generate: protectedProcedure
      .input(z.object({ prompt: z.string().min(10).max(1000) }))
      .mutation(async ({ input, ctx }) => {
        const result = await executeCreativeRitual(input.prompt);
        
        if (!result.success) {
          throw new Error(result.error_message || "Story generation failed");
        }

        // Store story in database
        const storyData = {
          userId: ctx.user.id,
          title: result.metadata.title,
          prompt: result.metadata.prompt,
          content: result.story_text,
          ritualId: result.metadata.ritualId,
          wordCount: result.metadata.wordCount,
          qualityScore: Math.round(result.metadata.qualityScore * 100),
          ethicalApproval: result.metadata.ethicalApproval ? 1 : 0,
          ucfHarmony: Math.round(result.metadata.ucfSnapshot.harmony * 10000),
          ucfPrana: Math.round(result.metadata.ucfSnapshot.prana * 10000),
          ucfDrishti: Math.round(result.metadata.ucfSnapshot.drishti * 10000),
          ucfKlesha: Math.round(result.metadata.ucfSnapshot.klesha * 10000),
          ucfResilience: Math.round(result.metadata.ucfSnapshot.resilience * 10000),
          ucfZoom: Math.round(result.metadata.ucfSnapshot.zoom * 10000),
          agentContributions: JSON.stringify(result.metadata.agentContributions),
        };

        await db.createStory(storyData);

        // Store UCF trajectory
        for (const state of result.ucf_trajectory) {
          await db.createUcfState({
            ritualId: result.metadata.ritualId,
            step: state.step,
            harmony: Math.round(state.harmony * 10000),
            prana: Math.round(state.prana * 10000),
            drishti: Math.round(state.drishti * 10000),
            klesha: Math.round(state.klesha * 10000),
            resilience: Math.round(state.resilience * 10000),
            zoom: Math.round(state.zoom * 10000),
          });
        }

        // Store agent logs
        for (const output of result.agent_outputs) {
          await db.createAgentLog({
            ritualId: result.metadata.ritualId,
            agentName: output.agentName,
            agentSymbol: output.agentSymbol,
            role: output.role,
            content: output.content,
          });
        }

        return {
          ritualId: result.metadata.ritualId,
          title: result.metadata.title,
          storyText: result.story_text,
          metadata: result.metadata,
        };
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      const allStories = await db.getAllStories(userId);
      
      return allStories.map(story => ({
        id: story.id,
        title: story.title,
        prompt: story.prompt,
        ritualId: story.ritualId,
        wordCount: story.wordCount,
        qualityScore: story.qualityScore / 100,
        ethicalApproval: story.ethicalApproval === 1,
        ucfHarmony: story.ucfHarmony / 10000,
        createdAt: story.createdAt,
      }));
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const story = await db.getStoryById(input.id);
        if (!story) return null;

        return {
          ...story,
          qualityScore: story.qualityScore / 100,
          ethicalApproval: story.ethicalApproval === 1,
          ucfHarmony: story.ucfHarmony / 10000,
          ucfPrana: story.ucfPrana / 10000,
          ucfDrishti: story.ucfDrishti / 10000,
          ucfKlesha: story.ucfKlesha / 10000,
          ucfResilience: story.ucfResilience / 10000,
          ucfZoom: story.ucfZoom / 10000,
          agentContributions: JSON.parse(story.agentContributions),
        };
      }),

    getByRitualId: publicProcedure
      .input(z.object({ ritualId: z.string() }))
      .query(async ({ input }) => {
        const story = await db.getStoryByRitualId(input.ritualId);
        if (!story) return null;

        return {
          ...story,
          qualityScore: story.qualityScore / 100,
          ethicalApproval: story.ethicalApproval === 1,
          ucfHarmony: story.ucfHarmony / 10000,
          ucfPrana: story.ucfPrana / 10000,
          ucfDrishti: story.ucfDrishti / 10000,
          ucfKlesha: story.ucfKlesha / 10000,
          ucfResilience: story.ucfResilience / 10000,
          ucfZoom: story.ucfZoom / 10000,
          agentContributions: JSON.parse(story.agentContributions),
        };
      }),

    getUcfTrajectory: publicProcedure
      .input(z.object({ ritualId: z.string() }))
      .query(async ({ input }) => {
        const states = await db.getUcfStatesByRitualId(input.ritualId);
        return states.map(state => ({
          step: state.step,
          harmony: state.harmony / 10000,
          prana: state.prana / 10000,
          drishti: state.drishti / 10000,
          klesha: state.klesha / 10000,
          resilience: state.resilience / 10000,
          zoom: state.zoom / 10000,
          timestamp: state.timestamp,
        }));
      }),

    getAgentLogs: publicProcedure
      .input(z.object({ ritualId: z.string() }))
      .query(async ({ input }) => {
        return await db.getAgentLogsByRitualId(input.ritualId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
