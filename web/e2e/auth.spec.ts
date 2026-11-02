import { test, expect } from '@playwright/test';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'test'].join('.');
const session = { access_token: jwt, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user };
test.beforeEach(async ({ page }) => {
 await page.route('**/api/membership/config', r => r.fulfill({json:{url:'https://test.supabase.co',anonKey:'test-anon',checkoutEnabled:false}}));
 await page.route('https://test.supabase.co/**', r => {
  if(r.request().url().includes('/logout')) return r.fulfill({status:204});
  if(r.request().url().includes('/user')) return r.fulfill({json:user});
  return r.fulfill({json:session});
 });
});
test('login survives refresh and sign out removes access to offers', async ({page}) => {
 await page.goto('/');
 await page.getByLabel('Email', {exact:true}).fill('test@example.com');
 await page.getByLabel('Password', {exact:true}).fill('password-123');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Search verified prices'})).toBeEnabled();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('button',{name:'Search verified prices'})).toBeDisabled();
 await page.reload();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
});
test('recovery request returns to password change route', async ({page}) => {
 await page.goto('/');
 await page.getByLabel('Email',{exact:true}).fill('test@example.com');
 const request = page.waitForRequest(r=>r.url().includes('/recover'));
 await page.getByRole('button',{name:'Forgot password?'}).click();
 expect((await request).url()).toContain('redirect_to=');
 expect(decodeURIComponent((await request).url())).toContain('/account/update-password');
});
test('recovery link updates password and removes token fragment', async ({page}) => {
 await page.goto('/account/update-password#access_token='+jwt+'&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer&type=recovery');
 await page.getByLabel('New password',{exact:true}).fill('new-password-123');
 await page.getByLabel('Confirm new password',{exact:true}).fill('new-password-123');
 const request = page.waitForRequest(r=>r.method()==='PUT'&&r.url().includes('/user'));
 await page.getByRole('button',{name:'Save password'}).click();
 expect((await request).postDataJSON().password).toBe('new-password-123');
 await expect(page.getByText('Password updated.')).toBeVisible();
 expect(new URL(page.url()).hash).toBe('');
});
