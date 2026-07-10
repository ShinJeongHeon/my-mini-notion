import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

test('renders a button with its label', () => {
  render(<Button>저장</Button>)
  expect(screen.getByRole('button', { name: '저장' })).toBeDefined()
})
