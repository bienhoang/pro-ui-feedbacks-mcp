import type { SyncPayload } from '../../src/types/sync-payload.js';

export const VALID_PAGE = {
  url: 'https://example.com/dashboard',
  pathname: '/dashboard',
  viewport: { width: 1440, height: 900 },
};

export const VALID_ELEMENT = {
  selector: '.checkout-form > button.btn-primary',
  tagName: 'button',
  className: 'btn-primary',
  elementId: 'submit-btn',
  elementPath: '.checkout-form > .actions > button',
  fullPath: 'body > main > form.checkout-form > div.actions > button.btn-primary',
  elementDescription: 'button: "Submit Order"',
  boundingBox: { x: 892, y: 1247, width: 120, height: 40 },
  accessibility: { role: 'button', label: 'Submit Order' },
};

export const VALID_FEEDBACK = {
  id: 'fb-001',
  stepNumber: 1,
  content: 'Change button color to green',
  selector: '.checkout-form > button.btn-primary',
  pageX: 952,
  pageY: 1267,
  createdAt: Date.now(),
  element: VALID_ELEMENT,
};

export const createdPayload: SyncPayload = {
  event: 'feedback.created',
  timestamp: Date.now(),
  page: VALID_PAGE,
  feedback: VALID_FEEDBACK,
};

export const updatedPayload: SyncPayload = {
  event: 'feedback.updated',
  timestamp: Date.now(),
  page: VALID_PAGE,
  feedbackId: 'fb-001',
  updatedContent: 'Change to green for better UX',
};

export const deletedPayload: SyncPayload = {
  event: 'feedback.deleted',
  timestamp: Date.now(),
  page: VALID_PAGE,
  feedbackId: 'fb-001',
};

export const batchPayload: SyncPayload = {
  event: 'feedback.batch',
  timestamp: Date.now(),
  page: VALID_PAGE,
  feedbacks: [
    { ...VALID_FEEDBACK, id: 'fb-001', content: 'First feedback' },
    { ...VALID_FEEDBACK, id: 'fb-002', content: 'Second feedback', stepNumber: 2 },
    { ...VALID_FEEDBACK, id: 'fb-003', content: 'Third feedback', stepNumber: 3 },
  ],
};

export const areaPayload: SyncPayload = {
  event: 'feedback.created',
  timestamp: Date.now(),
  page: VALID_PAGE,
  feedback: {
    id: 'fb-area-001',
    stepNumber: 1,
    content: 'These buttons should be aligned',
    selector: '',
    pageX: 500,
    pageY: 300,
    createdAt: Date.now(),
    isAreaOnly: false,
    areaData: { centerX: 500, centerY: 300, width: 200, height: 100, elementCount: 3 },
    elements: [
      { selector: '.btn-1', tagName: 'button', className: 'btn', elementId: '' },
      { selector: '.btn-2', tagName: 'button', className: 'btn', elementId: '' },
      { selector: '.btn-3', tagName: 'button', className: 'btn', elementId: '' },
    ],
  },
};
