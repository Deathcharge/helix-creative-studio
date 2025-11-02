# Quality-of-Life Features Implementation Guide

**Status**: Backend infrastructure complete (v1.6), ready for UI integration

## What's Already Done ✅

### Database Schema (v1.6)
- ✅ Collections table (`collections` table with userId, name, description, color)
- ✅ Story QoL fields: `collectionId`, `tags` (JSON), `isFavorite`, `deletedAt`
- ✅ Migration applied: `drizzle/0003_strange_vermin.sql`

### Backend Infrastructure
- ✅ Database helpers: `server/dbQoL.ts` (all CRUD operations)
- ✅ API endpoint templates: `server/routers_qol.ts` (copy-paste ready)
- ✅ Imports added to routers.ts: `dbQoL` and `TRPCError`

## What Needs to Be Done 🔄

### Phase 1: Integrate Backend Endpoints (30 min)
1. **Copy QoL endpoints into routers.ts**
   - Open `server/routers_qol.ts`
   - Copy all endpoints into the `story` router (before closing `})`)
   - Ensure proper indentation and syntax

2. **Verify TypeScript compilation**
   ```bash
   cd /home/ubuntu/helix-creative-studio
   pnpm build  # Should compile with 0 errors
   ```

3. **Test endpoints** (optional)
   - Use tRPC client to test each endpoint
   - Verify authorization checks work

### Phase 2: Build Archive UI Components (45 min)

#### 2.1 Update Archive.tsx
Add to the Archive page:
- **Search bar** (search by title)
- **Filter dropdowns**:
  - Collection selector
  - Tags filter
  - Show favorites only
  - Show deleted stories
- **Sort controls**: Date, Quality, Word Count
- **Bulk selection** (checkboxes)
- **Bulk actions** (delete, move to collection, add tags)

#### 2.2 Create ArchiveFilters Component
```typescript
// client/src/components/ArchiveFilters.tsx
interface ArchiveFiltersProps {
  collections: Collection[];
  tags: string[];
  onFilterChange: (filters: FilterState) => void;
}

// Should include:
// - Search input
// - Collection dropdown
// - Tags multi-select
// - Favorites toggle
// - Sort dropdown
```

#### 2.3 Create CollectionManager Component
```typescript
// client/src/components/CollectionManager.tsx
// Should include:
// - Create new collection button
// - Edit collection (name, color, description)
// - Delete collection
// - Drag-drop stories into collections
```

### Phase 3: Update Story Detail Page (30 min)

#### 3.1 Add to Story.tsx
- **Delete button** with confirmation dialog
- **Favorite button** (star icon toggle)
- **Tags editor** (add/remove tags)
- **Move to collection** dropdown
- **Restore button** (if story is deleted)

#### 3.2 Create DeleteConfirmationDialog Component
```typescript
// client/src/components/DeleteConfirmationDialog.tsx
interface DeleteConfirmationDialogProps {
  storyTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

### Phase 4: Add UI Components (45 min)

#### 4.1 Tag Editor
```typescript
// client/src/components/TagEditor.tsx
interface TagEditorProps {
  tags: string[];
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
}
```

#### 4.2 Collection Selector
```typescript
// client/src/components/CollectionSelector.tsx
interface CollectionSelectorProps {
  collections: Collection[];
  selectedCollectionId: number | null;
  onSelect: (collectionId: number | null) => void;
}
```

#### 4.3 Bulk Actions Toolbar
```typescript
// client/src/components/BulkActionsToolbar.tsx
interface BulkActionsToolbarProps {
  selectedCount: number;
  collections: Collection[];
  onDelete: () => void;
  onMoveToCollection: (collectionId: number) => void;
  onAddTags: (tags: string[]) => void;
}
```

## API Endpoints Reference

All endpoints are in the `story` router:

### Delete Operations
- `story.deleteStory` - Soft delete (sets deletedAt)
- `story.restoreStory` - Restore deleted story

### Favorites
- `story.toggleFavorite` - Toggle favorite status
- `story.getFavorites` - Get all favorite stories

### Tags
- `story.updateTags` - Update story tags
- `story.getAllTags` - Get all tags used by user
- `story.getStoriesByTag` - Get stories with specific tag

### Collections
- `story.createCollection` - Create new collection
- `story.getUserCollections` - Get user's collections
- `story.getStoriesByCollection` - Get stories in collection
- `story.moveToCollection` - Move story to collection
- `story.deleteCollection` - Delete collection
- `story.updateCollection` - Update collection metadata

## Implementation Order (Recommended)

1. **Copy endpoints** → routers.ts (5 min)
2. **Create ArchiveFilters component** (20 min)
3. **Update Archive.tsx** to use filters (15 min)
4. **Create CollectionManager** (20 min)
5. **Update Story.tsx** with delete/favorite/tags (20 min)
6. **Create supporting components** (TagEditor, etc.) (20 min)
7. **Test all features** (15 min)
8. **Save checkpoint v1.7** and push to GitHub

## Code Snippets

### Using the QoL endpoints in React

```typescript
// Delete story
const deleteStory = trpc.story.deleteStory.useMutation({
  onSuccess: () => {
    router.push('/archive');
    toast.success('Story deleted');
  },
});

// Toggle favorite
const toggleFav = trpc.story.toggleFavorite.useMutation();
const handleFavorite = () => {
  toggleFav.mutate({ id: storyId, isFavorite: !isFavorite });
};

// Get collections
const { data: collections } = trpc.story.getUserCollections.useQuery();

// Move to collection
const moveToCollection = trpc.story.moveToCollection.useMutation();
```

### Archive filtering example

```typescript
const [filters, setFilters] = useState({
  search: '',
  collectionId: null,
  tags: [],
  favoritesOnly: false,
  showDeleted: false,
});

// Apply filters to stories
const filtered = stories.filter(story => {
  if (filters.search && !story.title.includes(filters.search)) return false;
  if (filters.collectionId && story.collectionId !== filters.collectionId) return false;
  if (filters.favoritesOnly && !story.isFavorite) return false;
  if (!filters.showDeleted && story.deletedAt) return false;
  return true;
});
```

## Files to Modify

1. `server/routers.ts` - Add QoL endpoints
2. `client/src/pages/Archive.tsx` - Add filters and bulk actions
3. `client/src/pages/Story.tsx` - Add delete/favorite/tags
4. `client/src/components/` - Create new components (ArchiveFilters, CollectionManager, etc.)
5. `todo.md` - Update completed items

## Testing Checklist

- [ ] All endpoints compile without errors
- [ ] Delete story (soft delete) works
- [ ] Restore deleted story works
- [ ] Toggle favorite works
- [ ] Add/remove tags works
- [ ] Create collection works
- [ ] Move story to collection works
- [ ] Filter by collection works
- [ ] Filter by tags works
- [ ] Search by title works
- [ ] Bulk delete works
- [ ] Authorization checks prevent unauthorized access

## Notes

- All endpoints include authorization checks (`ctx.user.id`)
- Soft delete uses `deletedAt` timestamp (can be restored)
- Tags are stored as JSON array in database
- Collections are user-specific
- All mutations use `protectedProcedure` (require authentication)

## Next Steps After Completion

1. Add sorting options (date, quality, word count)
2. Add bulk export as ZIP
3. Add keyboard shortcuts
4. Add drag-and-drop for collections
5. Add story preview on hover
6. Consider full-text search optimization

---

**Last Updated**: v1.6 checkpoint
**Status**: Ready for UI implementation
**Estimated Time**: 3-4 hours for complete implementation

