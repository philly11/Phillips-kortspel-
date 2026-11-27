import type { RuleConfig } from '@kortspel/engine';
import { RULE_LIMITS } from '@kortspel/server/protocol';
import { theme } from './theme';
import { inputStyle } from './ui';

/** What's typed in each box. Kept as text, so a half-typed number doesn't jump around. */
export type SettingsText = { readonly [Setting in keyof RuleConfig]: string };

/** The settings, in the order they're shown, each with a label and a short explanation. */
const FIELDS: readonly { readonly setting: keyof RuleConfig; readonly label: string; readonly help: string }[] = [
  { setting: 'startingChips', label: 'Starting chips', help: 'what everyone starts with' },
  { setting: 'ante', label: 'Ante', help: 'everyone pays this into the pot before betting' },
  { setting: 'trickBonus', label: 'Trick bonus', help: 'taken from the pot for each trick you win' },
  { setting: 'chopPayment', label: 'Chop payment', help: 'the chopped player pays the chopper' },
];

interface RoomSettingsProps {
  value: SettingsText;
  onChange: (next: SettingsText) => void;
}

/**
 * The chip settings for a new room, folded away under "Chip settings" until opened.
 * The boxes show the allowed range, but the SERVER makes the final call: anything
 * outside the range is clamped there.
 */
export function RoomSettings({ value, onChange }: RoomSettingsProps) {
  return (
    <details style={{ fontSize: 18 }}>
      <summary style={{ cursor: 'pointer', color: theme.colors.tableTextMuted }}>Chip settings for your room</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {FIELDS.map(({ setting, label, help }) => {
          const { min, max } = RULE_LIMITS[setting];
          return (
            <label key={setting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>
                {label}
                <br />
                <span style={{ fontSize: 14, color: theme.colors.tableTextMuted }}>
                  {help} ({min}–{max})
                </span>
              </span>
              <input
                type="number"
                min={min}
                max={max}
                value={value[setting]}
                onChange={(event) => onChange({ ...value, [setting]: event.target.value })}
                style={{ ...inputStyle, width: 120 }}
              />
            </label>
          );
        })}
      </div>
    </details>
  );
}