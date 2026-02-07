import { describe, it, expect } from 'vitest';
import { toolSuccess, toolError } from '../src/tools/tool-helpers.js';

describe('toolSuccess', () => {
  it('should return formatted content with JSON string', () => {
    const result = toolSuccess({ key: 'value' });
    expect(result).toEqual({
      content: [{ type: 'text', text: '{\n  "key": "value"\n}' }],
    });
  });

  it('should handle arrays', () => {
    const result = toolSuccess([1, 2, 3]);
    expect(result.content[0].text).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('should handle empty arrays', () => {
    const result = toolSuccess([]);
    expect(result.content[0].text).toBe('[]');
  });

  it('should not include isError', () => {
    const result = toolSuccess({ data: true });
    expect(result).not.toHaveProperty('isError');
  });
});

describe('toolError', () => {
  it('should return error content with message', () => {
    const result = toolError('Something went wrong');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Something went wrong' }],
      isError: true,
    });
  });

  it('should always have isError true', () => {
    const result = toolError('test');
    expect(result.isError).toBe(true);
  });
});
