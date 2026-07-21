import { Response } from 'express';
import { prisma } from '../services/db';
import { AuthenticatedRequest } from '../types';
import { analyzeMeetingNotes } from '../services/ai';

// GET /api/sessions - Get all sessions for the authenticated user
export async function getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sessions = await prisma.analysisSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(sessions);
  } catch (error) {
    console.error('Error in getSessions:', error);
    res.status(500).json({ error: 'Internal server error fetching sessions' });
  }
}

// GET /api/sessions/:id - Get session by id (includes analysis if it exists)
export async function getSessionById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await prisma.analysisSession.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this session' });
      return;
    }

    const analysis = session.analyses[0] || null;

    res.status(200).json({
      session: {
        id: session.id,
        userId: session.userId,
        title: session.title,
        meetingNotes: session.meetingNotes,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      analysis: analysis ? {
        id: analysis.id,
        sessionId: analysis.sessionId,
        executiveSummary: analysis.executiveSummary,
        functionalRequirements: analysis.functionalRequirements,
        userStories: analysis.userStories,
        acceptanceCriteria: analysis.acceptanceCriteria,
        risks: analysis.risks,
        assumptions: analysis.assumptions,
        clarifyingQuestions: analysis.clarifyingQuestions,
        createdAt: analysis.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error in getSessionById:', error);
    res.status(500).json({ error: 'Internal server error fetching session details' });
  }
}

// POST /api/sessions - Create a new session
export async function createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { title, meetingNotes } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!title || !meetingNotes) {
      res.status(400).json({ error: 'Title and meeting notes are required' });
      return;
    }

    const newSession = await prisma.analysisSession.create({
      data: {
        userId,
        title: title.trim(),
        meetingNotes
      }
    });

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error in createSession:', error);
    res.status(500).json({ error: 'Internal server error creating session' });
  }
}

// PUT /api/sessions/:id - Update session (or its analysis directly)
export async function updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, meetingNotes, analysis } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await prisma.analysisSession.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this session' });
      return;
    }

    // Update session text fields
    const updatedSession = await prisma.analysisSession.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        meetingNotes: meetingNotes !== undefined ? meetingNotes : undefined
      }
    });

    // If analysis payload is provided, update or save it directly (allows manual edits to the analysis)
    let updatedAnalysis = null;
    if (analysis) {
      const existingAnalysis = await prisma.aIAnalysis.findFirst({
        where: { sessionId: id }
      });

      if (existingAnalysis) {
        updatedAnalysis = await prisma.aIAnalysis.update({
          where: { id: existingAnalysis.id },
          data: {
            executiveSummary: analysis.executiveSummary,
            functionalRequirements: analysis.functionalRequirements,
            userStories: analysis.userStories,
            acceptanceCriteria: analysis.acceptanceCriteria || null,
            risks: analysis.risks,
            assumptions: analysis.assumptions,
            clarifyingQuestions: analysis.clarifyingQuestions
          }
        });
      } else {
        updatedAnalysis = await prisma.aIAnalysis.create({
          data: {
            sessionId: id,
            executiveSummary: analysis.executiveSummary,
            functionalRequirements: analysis.functionalRequirements,
            userStories: analysis.userStories,
            acceptanceCriteria: analysis.acceptanceCriteria || null,
            risks: analysis.risks,
            assumptions: analysis.assumptions,
            clarifyingQuestions: analysis.clarifyingQuestions
          }
        });
      }
    }

    res.status(200).json({
      message: 'Session updated successfully',
      session: updatedSession,
      analysis: updatedAnalysis
    });
  } catch (error) {
    console.error('Error in updateSession:', error);
    res.status(500).json({ error: 'Internal server error updating session' });
  }
}

// DELETE /api/sessions/:id - Delete a session and its associated analysis
export async function deleteSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await prisma.analysisSession.findUnique({
      where: { id }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Cascade delete is defined in schema.prisma, so deleting the session
    // will automatically delete all related AIAnalysis and ExportRecord records.
    await prisma.analysisSession.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Session and related documents deleted successfully' });
  } catch (error) {
    console.error('Error in deleteSession:', error);
    res.status(500).json({ error: 'Internal server error deleting session' });
  }
}

// POST /api/analysis/generate - Generate analysis using Gemini AI
export async function generateAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const session = await prisma.analysisSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const notes = session.meetingNotes;
    if (!notes || notes.trim().length === 0) {
      res.status(400).json({ error: 'Cannot analyze empty meeting notes' });
      return;
    }

    // Trigger analysis service
    const aiResult = await analyzeMeetingNotes(notes);

    // Save or update analysis document
    const existingAnalysis = await prisma.aIAnalysis.findFirst({
      where: { sessionId }
    });

    let savedAnalysis;

    if (existingAnalysis) {
      savedAnalysis = await prisma.aIAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          executiveSummary: aiResult.executiveSummary,
          functionalRequirements: aiResult.functionalRequirements,
          userStories: aiResult.userStories,
          acceptanceCriteria: null,
          risks: aiResult.risks,
          assumptions: aiResult.assumptions,
          clarifyingQuestions: aiResult.clarifyingQuestions
        }
      });
    } else {
      savedAnalysis = await prisma.aIAnalysis.create({
        data: {
          sessionId,
          executiveSummary: aiResult.executiveSummary,
          functionalRequirements: aiResult.functionalRequirements,
          userStories: aiResult.userStories,
          acceptanceCriteria: null,
          risks: aiResult.risks,
          assumptions: aiResult.assumptions,
          clarifyingQuestions: aiResult.clarifyingQuestions
        }
      });
    }

    res.status(200).json(savedAnalysis);
  } catch (error) {
    console.error('Error generating analysis:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI generation failed' });
  }
}

// POST /api/export/markdown - Export session + analysis to Markdown
export async function exportMarkdown(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { sessionId, title, analysis } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!sessionId || !analysis) {
      res.status(400).json({ error: 'Session ID and analysis payload are required' });
      return;
    }

    // Verify user owns the session to prevent IDOR / Broken Object Level Authorization
    const session = await prisma.analysisSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this session' });
      return;
    }

    // Track export in Prisma ExportRecord table
    await prisma.exportRecord.create({
      data: {
        sessionId,
        exportType: 'markdown'
      }
    });

    // Generate markdown string
    let markdown = `# ${title || 'Business Analysis Document'}\n\n`;
    markdown += `*Generated by BA Copilot on ${new Date().toLocaleDateString()}*\n\n`;

    if (analysis.executiveSummary) {
      markdown += `## Executive Summary\n\n${analysis.executiveSummary}\n\n`;
    }

    if (analysis.functionalRequirements && analysis.functionalRequirements.length > 0) {
      markdown += `## Functional Requirements\n\n`;
      analysis.functionalRequirements.forEach((reqStr: string, idx: number) => {
        markdown += `${idx + 1}. ${reqStr}\n`;
      });
      markdown += `\n`;
    }

    if (analysis.userStories && analysis.userStories.length > 0) {
      markdown += `## User Stories & Acceptance Criteria\n\n`;
      analysis.userStories.forEach((story: any, idx: number) => {
        markdown += `### US-${idx + 1}: ${story.title}\n\n`;
        markdown += `**User Story:**\n> ${story.story}\n\n`;
        if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
          markdown += `**Acceptance Criteria:**\n`;
          story.acceptanceCriteria.forEach((ac: string) => {
            markdown += `- [ ] ${ac}\n`;
          });
          markdown += `\n`;
        }
      });
    }

    if (analysis.risks && analysis.risks.length > 0) {
      markdown += `## Identified Risks\n\n`;
      analysis.risks.forEach((risk: string) => {
        markdown += `- ${risk}\n`;
      });
      markdown += `\n`;
    }

    if (analysis.assumptions && analysis.assumptions.length > 0) {
      markdown += `## Assumptions\n\n`;
      analysis.assumptions.forEach((assumption: string) => {
        markdown += `- ${assumption}\n`;
      });
      markdown += `\n`;
    }

    if (analysis.clarifyingQuestions && analysis.clarifyingQuestions.length > 0) {
      markdown += `## Clarifying Questions\n\n`;
      analysis.clarifyingQuestions.forEach((q: string) => {
        markdown += `- ${q}\n`;
      });
      markdown += `\n`;
    }

    res.status(200).json({ markdown });
  } catch (error) {
    console.error('Error exporting markdown:', error);
    res.status(500).json({ error: 'Internal server error during markdown export' });
  }
}

// POST /api/export/pdf - Export session + analysis to PDF (sends structured printable HTML content/or print trigger)
export async function exportPDF(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Verify user owns the session to prevent IDOR / Broken Object Level Authorization
    const session = await prisma.analysisSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not own this session' });
      return;
    }

    // Track export in Prisma ExportRecord table
    await prisma.exportRecord.create({
      data: {
        sessionId,
        exportType: 'pdf'
      }
    });

    res.status(200).json({ success: true, message: 'PDF export action logged.' });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Internal server error during PDF export action log' });
  }
}
