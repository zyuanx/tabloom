import type { BookmarkNode } from '../types'

export const mockBookmarks: BookmarkNode[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        parentId: '0',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            parentId: '1',
            title: 'Product craft',
            children: [
              { id: '101', parentId: '10', title: 'Linear method', url: 'https://linear.app/method' },
              { id: '102', parentId: '10', title: 'Mobbin design library', url: 'https://mobbin.com' },
              {
                id: '103',
                parentId: '10',
                title: 'Research',
                children: [
                  { id: '1031', parentId: '103', title: 'Nielsen Norman Group', url: 'https://www.nngroup.com' },
                  { id: '1032', parentId: '103', title: 'Laws of UX', url: 'https://lawsofux.com' },
                ],
              },
            ],
          },
          {
            id: '20',
            parentId: '1',
            title: 'Build & ship',
            children: [
              { id: '201', parentId: '20', title: 'GitHub', url: 'https://github.com' },
              { id: '202', parentId: '20', title: 'Vercel dashboard', url: 'https://vercel.com/dashboard' },
              { id: '203', parentId: '20', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
              {
                id: '204',
                parentId: '20',
                title: 'Frontend',
                children: [
                  { id: '2041', parentId: '204', title: 'React', url: 'https://react.dev' },
                  { id: '2042', parentId: '204', title: 'TypeScript', url: 'https://www.typescriptlang.org' },
                ],
              },
            ],
          },
          {
            id: '30',
            parentId: '1',
            title: 'Read later',
            children: [
              { id: '301', parentId: '30', title: 'The Marginalian', url: 'https://www.themarginalian.org' },
              { id: '302', parentId: '30', title: 'Aeon Essays', url: 'https://aeon.co/essays' },
            ],
          },
          { id: '40', parentId: '1', title: 'Figma', url: 'https://figma.com' },
          { id: '41', parentId: '1', title: 'Notion', url: 'https://notion.so' },
        ],
      },
      { id: '2', parentId: '0', title: 'Other bookmarks', children: [] },
      { id: '3', parentId: '0', title: 'Mobile bookmarks', children: [] },
    ],
  },
]
