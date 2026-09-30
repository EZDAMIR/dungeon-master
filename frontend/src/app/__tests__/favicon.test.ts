import { expect, it } from 'vitest'
import html from '../../../index.html?raw'
import brandMark from '../../../public/design/dm-mark.svg?raw'

it('uses the application brand SVG as a tab icon under any deployment base', () => {
  const page = new DOMParser().parseFromString(html, 'text/html')
  const icon = page.querySelector('link[rel="icon"]')
  expect(icon?.getAttribute('type')).toBe('image/svg+xml')
  expect(icon?.getAttribute('href')).toBe('%BASE_URL%design/dm-mark.svg')
  const svg = new DOMParser().parseFromString(brandMark, 'image/svg+xml')
  expect(svg.querySelector('parsererror')).toBeNull()
  expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 36 36')
  expect(svg.querySelector('path')).not.toBeNull()
})
