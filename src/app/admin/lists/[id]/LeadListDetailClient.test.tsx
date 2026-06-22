import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && !window.PointerEvent) {
  // @ts-ignore
  window.PointerEvent = window.MouseEvent;
}
if (typeof Element !== 'undefined') {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// Mock actions used by the component
vi.mock('../actions', () => {
  return {
    searchLeadsForListAction: async (q: string) => {
      return [
        { id: 'a', name: 'Alice', phone: '111', service: 'Service A', service_option: null, add_on_labels: null, vehicle_type: null, car_brand: null, car_model: null, car_number: null, status: 'new' },
        { id: 'b', name: 'Bob', phone: '222', service: 'Service B', service_option: null, add_on_labels: null, vehicle_type: null, car_brand: null, car_model: null, car_number: null, status: 'new' },
      ];
    },
    addLeadsToListAction: async () => ({ ok: true }),
    removeLeadFromListAction: async () => ({ ok: true }),
    deleteLeadListAction: async () => {},
  };
});

import LeadListDetailClient from './LeadListDetailClient';

const fakeList = { id: 'list1', name: 'My List', assigned_admin_user: { name: 'Admin' } };

test('pointer drag selects range on touch', async () => {
  const { container } = render(<LeadListDetailClient list={fakeList as any} initialLeads={[]} isSuperAdmin={true} />);

  // type a search and click Search
  const input = screen.getByPlaceholderText(/Search leads/i);
  await userEvent.type(input, 'Alice');
  const searchBtn = screen.getByRole('button', { name: /Search/i });
  await userEvent.click(searchBtn);

  // wait for results
  await waitFor(() => screen.getByText('Alice'));

  // find first and second result buttons by data-index attribute
  const btnA = document.querySelector('button[data-index="0"]') as HTMLElement;
  const btnB = document.querySelector('button[data-index="1"]') as HTMLElement;
  expect(btnA).toBeTruthy();
  expect(btnB).toBeTruthy();

  // simulate pointer down on first, move to second, and up
  const originalElementFromPoint = document.elementFromPoint;
  document.elementFromPoint = (x: number, y: number) => {
    if (x === 2 && y === 2) return btnB;
    return null;
  };

  fireEvent.pointerDown(btnA, { pointerId: 1, clientX: 0, clientY: 0 });
  // move to a point inside btnB
  const rect = btnB.getBoundingClientRect();
  fireEvent.pointerMove(btnA, { clientX: rect.left + 2, clientY: rect.top + 2 });
  fireEvent.pointerUp(btnA, { pointerId: 1 });

  // restore
  document.elementFromPoint = originalElementFromPoint;

  // check that selection summary appears with 2 leads selected
  await waitFor(() => expect(container.textContent).toContain("2 leads selected"));
});
