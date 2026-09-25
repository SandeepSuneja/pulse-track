import { Box, Typography } from '@mui/material'
import { PRESET_CATEGORY_COLORS } from '../constants'

function normalizeHex(value) {
  let v = String(value || '').trim()
  if (!v.startsWith('#')) v = `#${v}`
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return null
  return v.toUpperCase()
}

const CONTROL_H = 44

/**
 * Compact category color control: clickable preview (opens OS picker) + hex + presets.
 */
export default function CategoryColorPicker({ value, onChange, disabled = false }) {
  const hex = normalizeHex(value) || '#22D3EE'
  const hexDraft = value?.startsWith?.('#') && !normalizeHex(value) ? value : hex

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        component="label"
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 600 }}
      >
        Color
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `${CONTROL_H}px minmax(0, 1fr)`,
          alignItems: 'center',
          columnGap: 1.25,
          mb: 1.75,
        }}
      >
        {/* Preview doubles as the color picker trigger — no awkward native swatch chrome */}
        <Box
          component="label"
          sx={{
            position: 'relative',
            width: CONTROL_H,
            height: CONTROL_H,
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.55 : 1,
            border: '1px solid rgba(34,211,238,0.28)',
            boxSizing: 'border-box',
            backgroundColor: hex,
            flexShrink: 0,
            '&:hover': disabled
              ? undefined
              : {
                  boxShadow: '0 0 0 2px rgba(34,211,238,0.28)',
                },
          }}
          title="Pick a custom color"
        >
          <Box
            component="input"
            type="color"
            value={hex}
            disabled={disabled}
            onChange={(e) => onChange(normalizeHex(e.target.value) || hex)}
            aria-label="Pick a custom color"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              border: 0,
              padding: 0,
              cursor: disabled ? 'default' : 'pointer',
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: CONTROL_H,
            px: 1.5,
            borderRadius: '12px',
            border: '1px solid rgba(34,211,238,0.22)',
            boxSizing: 'border-box',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', flexShrink: 0, fontWeight: 600 }}
          >
            Hex
          </Typography>
          <Box
            component="input"
            type="text"
            value={hexDraft}
            disabled={disabled}
            spellCheck={false}
            maxLength={7}
            aria-label="Hex color"
            placeholder="#22D3EE"
            onChange={(e) => {
              const next = normalizeHex(e.target.value)
              if (next) onChange(next)
              else onChange(e.target.value)
            }}
            onBlur={() => onChange(normalizeHex(value) || hex)}
            sx={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              m: 0,
              p: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: '#E8F1FF',
              fontSize: '0.95rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              letterSpacing: '0.04em',
              '&:disabled': { opacity: 0.6 },
            }}
          />
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 600 }}
      >
        Presets
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1,
          width: '100%',
        }}
      >
        {PRESET_CATEGORY_COLORS.map((swatch) => {
          const selected = hex.toUpperCase() === swatch.toUpperCase()
          return (
            <Box
              key={swatch}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Preset ${swatch}`}
              aria-pressed={selected}
              title={swatch}
              onClick={() => {
                if (!disabled) onChange(swatch)
              }}
              onKeyDown={(e) => {
                if (disabled) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange(swatch)
                }
              }}
              sx={{
                aspectRatio: '1 / 1',
                width: '100%',
                borderRadius: '10px',
                boxSizing: 'border-box',
                border: selected ? '2px solid #22D3EE' : '1px solid rgba(255,255,255,0.14)',
                backgroundColor: swatch,
                backgroundImage: 'none',
                cursor: disabled ? 'default' : 'pointer',
                boxShadow: selected ? '0 0 0 2px rgba(34,211,238,0.25)' : 'none',
                opacity: disabled ? 0.55 : 1,
                transition: 'box-shadow 120ms ease, border-color 120ms ease',
              }}
            />
          )
        })}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        Click the swatch for a custom color, or pick a preset.
      </Typography>
    </Box>
  )
}

export { normalizeHex }
