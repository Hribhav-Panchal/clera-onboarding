import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AssistantProvider } from '../assistant/context'
import { ToastProvider } from '../components/Toast'
import type { AppState } from '../state/reducer'
import { StoreProvider } from '../state/store'

export function renderAt(path: string, element: ReactNode, state: AppState, routePath = path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider initial={state}>
        <ToastProvider>
          <AssistantProvider>
            <Routes>
              <Route path={routePath} element={element} />
              <Route path="*" element={<p>elsewhere</p>} />
            </Routes>
          </AssistantProvider>
        </ToastProvider>
      </StoreProvider>
    </MemoryRouter>,
  )
}
