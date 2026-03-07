import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const libraryRouter = Router();

// List folders (tree with doc counts)
libraryRouter.get('/folders', requireAuth, async (req, res) => {
  try {
    const folders = await prisma.libraryFolder.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list folders' });
  }
});

// Get folder with documents
libraryRouter.get('/folders/:id', requireAuth, async (req, res) => {
  try {
    const folder = await prisma.libraryFolder.findUnique({
      where: { id: req.params.id as string },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            summary: true,
            status: true,
            tags: true,
            viewCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get folder' });
  }
});

// Get document by id
libraryRouter.get('/docs/:id', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.libraryDocument.findUnique({
      where: { id: req.params.id as string },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        folder: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Increment view count
    await prisma.libraryDocument.update({
      where: { id: doc.id },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get document' });
  }
});

// Create document
libraryRouter.post('/docs', requireAuth, async (req, res) => {
  try {
    const { folderId, title, slug, type, summary, content, tags } = req.body;

    const doc = await prisma.libraryDocument.create({
      data: {
        folderId,
        title,
        slug,
        type,
        summary,
        content,
        tags: tags || [],
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create document' });
  }
});

// Update document
libraryRouter.patch('/docs/:id', requireAuth, async (req, res) => {
  try {
    const { title, summary, content, status, tags } = req.body;

    const data: Record<string, any> = {};
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary;
    if (content !== undefined) data.content = content;
    if (status !== undefined) data.status = status;
    if (tags !== undefined) data.tags = tags;

    const doc = await prisma.libraryDocument.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update document' });
  }
});

// Search documents
libraryRouter.get('/search', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q as string) || '';

    if (!q.trim()) {
      res.json({ results: [], total: 0 });
      return;
    }

    const results = await prisma.libraryDocument.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        summary: true,
        status: true,
        tags: true,
        folderId: true,
        folder: {
          select: { id: true, name: true, slug: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to search documents' });
  }
});
