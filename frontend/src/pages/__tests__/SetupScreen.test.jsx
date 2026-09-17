// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SetupScreen from '../SetupScreen'
import { MODES, SETUP_COPY, STATS } from '../../copy/setup'

/**
 * Creating a companion — the mode half of it.
 *
 * The mode is the one thing on this screen that is not part of the
 * companion. It goes to `PATCH /settings` in a second request, because it
 * says what someone wants today rather than who their companion is.
 *
 * That second request is the reason this file exists. It can fail on its
 * own, and when it does the companion has already been created — so the
 * screen must not say setup failed and send someone back to a form they
 * have already filled in. The worst version of this bug is the one that
 * looks like carelessness to whoever is using it.
 */

vi.mock('../../api/columba', () => ({
  saveCharacter: vi.fn(),
  updateSettings: vi.fn(),
}))

const { saveCharacter, updateSettings } = await import('../../api/columba')

const fillTheRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(SETUP_COPY.nameLabel), {
    target: { value: 'vega' },
  })
  fireEvent.change(screen.getByLabelText(SETUP_COPY.ageLabel), {
    target: { value: '31-40' },
  })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: SETUP_COPY.submit }))

describe('choosing what you need right now', () => {
  let onCharacterCreated

  beforeEach(() => {
    vi.clearAllMocks()
    saveCharacter.mockResolvedValue({ success: true, character: { name: 'vega' } })
    updateSettings.mockResolvedValue({})
    onCharacterCreated = vi.fn()
    render(<SetupScreen onCharacterCreated={onCharacterCreated} />)
  })

  afterEach(cleanup)

  it('offers every mode there is', () => {
    for (const mode of MODES) {
      expect(screen.getByRole('button', { name: new RegExp(mode.label) })).toBeTruthy()
    }
  })

  it('sends the chosen mode to settings, not to the companion', async () => {
    const chosen = MODES.at(-1)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(chosen.label) }))
    fillTheRequiredFields()
    submit()

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ mode: chosen.key }))

    // The negative half, and the point of the split: a mode saved into the
    // character config as well would be one concept in two stores.
    const [sent] = saveCharacter.mock.calls[0]
    expect(sent.mode).toBeUndefined()
    expect(Object.keys(sent.stats).sort()).toEqual(STATS.map((stat) => stat.key).sort())
  })

  it('still creates the companion when the mode cannot be saved', async () => {
    // The companion exists by then and the mode is simply the default,
    // which is a sane place to land.
    updateSettings.mockRejectedValue(new Error('nope'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fillTheRequiredFields()
    submit()

    await waitFor(() => expect(onCharacterCreated).toHaveBeenCalled())
    expect(screen.queryByText(SETUP_COPY.saveFailed)).toBeNull()
  })

  it('does not create a companion when the companion itself fails to save', async () => {
    // The other side of the same coin: this failure IS worth showing,
    // because nothing was created and trying again is the right move.
    saveCharacter.mockRejectedValue(new Error('nope'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fillTheRequiredFields()
    submit()

    await waitFor(() => expect(screen.getByText(SETUP_COPY.saveFailed)).toBeTruthy())
    expect(onCharacterCreated).not.toHaveBeenCalled()
  })
})
