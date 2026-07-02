import client from '@sendgrid/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '../src/emailHelper';

vi.mock('@sendgrid/client', () => ({
  default: {
    setApiKey: vi.fn(),
    request: vi.fn().mockResolvedValue([
      {
        statusCode: 202,
        body: '',
        headers: {},
      },
      {},
    ]),
  },
}));

describe('notify', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVitest = process.env.VITEST;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (originalVitest === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalVitest;
    }
  });

  it('returns a fake response and does not call sendgrid in test mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.VITEST = 'true';

    const response = await notify('SG.fake-key', {
      method: 'POST',
      url: '/v3/mail/send',
    });

    expect(response[0].statusCode).toBe(202);
    expect(vi.mocked(client.setApiKey)).not.toHaveBeenCalled();
    expect(vi.mocked(client.request)).not.toHaveBeenCalled();
  });

  it('returns a fake response when NODE_ENV is test and VITEST is unset', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.VITEST;

    const response = await notify('SG.fake-key', {
      method: 'POST',
      url: '/v3/mail/send',
    });

    expect(response[0].statusCode).toBe(202);
    expect(vi.mocked(client.setApiKey)).not.toHaveBeenCalled();
    expect(vi.mocked(client.request)).not.toHaveBeenCalled();
  });

  it('calls sendgrid outside test mode', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VITEST;

    await notify('SG.real-key', {
      method: 'POST',
      url: '/v3/mail/send',
    });

    expect(vi.mocked(client.setApiKey)).toHaveBeenCalledWith('SG.real-key');
    expect(vi.mocked(client.request)).toHaveBeenCalledTimes(1);
  });
});
