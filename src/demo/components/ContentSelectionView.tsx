import { Box, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material'
import { categories } from '../constants'
import { dropdownMagentaStyles } from '../styles'
import type { ContentCategory, ContentItem } from '../types'

type ContentSelectionViewProps = {
  selectedCategory: ContentCategory
  filteredItems: ContentItem[]
  selectedContentIds: string[]
  onCategoryChange: (category: ContentCategory) => void
  onSelectContent: (item: ContentItem) => void
}

export function ContentSelectionView({
  selectedCategory,
  filteredItems,
  selectedContentIds,
  onCategoryChange,
  onSelectContent,
}: ContentSelectionViewProps) {
  return (
    <Stack spacing={2}>
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'rgba(255,255,255,0.5)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" color="text.primary">
            Content Selection
          </Typography>

          <FormControl sx={{ width: 240, ...dropdownMagentaStyles }} size="small">
            <InputLabel id="category-label">Content Category</InputLabel>
            <Select
              labelId="category-label"
              value={selectedCategory}
              label="Content Category"
              onChange={(event) => onCategoryChange(event.target.value as ContentCategory)}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 4,
          minHeight: 520,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'rgba(255,255,255,0.5)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))',
            gap: 2,
            alignItems: 'start',
            maxWidth: selectedCategory === 'All' ? '100%' : 380,
          }}
        >
          {filteredItems.map((item) => {
            const selected = selectedContentIds.includes(item.id)

            return (
              <Box key={item.id} role="button" onClick={() => onSelectContent(item)} sx={{ cursor: 'pointer' }}>
                <Box
                  sx={{
                    height: 156,
                    borderRadius: 2,
                    backgroundImage: `url(${item.posterUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: selected ? '3px solid #ed005e' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: selected ? '0 0 0 3px rgba(237, 0, 94, 0.15)' : 'none',
                  }}
                />
                <Typography
                  mt={0.5}
                  variant="body2"
                  sx={{
                    fontWeight: selected ? 700 : 500,
                    color: 'text.primary',
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Paper>
    </Stack>
  )
}
