console.log('Zoom Auto-Join Script - Direct XPath Implementation');

let joinButtonClicked = false;
let audioButtonClicked = false;

// Accept cookies if present
const clickAcceptCookies = () => {
  try {
    const cookieButton = document.evaluate(
      '//button[@id="onetrust-accept-btn-handler"]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (cookieButton) {
      console.log('Cookie button found, clicking...');
      cookieButton.click();
      return true;
    }
  } catch (e) {}
  return false;
};

// Accept terms if present
const clickAgreeButton = () => {
  try {
    const agreeButton = document.evaluate(
      '//button[@id="wc_agree1"]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (agreeButton) {
      console.log('Agree button found, clicking...');
      agreeButton.click();
      return true;
    }
  } catch (e) {}
  return false;
};

// Click the main Join button using exact class selector from Playwright
const clickPreviewJoinButton = () => {
  if (joinButtonClicked) return false;

  console.log('Looking for preview-join-button...');

  // Method 1: Direct class selector (from Playwright: button.preview-join-button)
  try {
    const button = document.querySelector('button.preview-join-button');
    if (button) {
      console.log('✓ Found button.preview-join-button, clicking...');
      button.click();
      joinButtonClicked = true;
      return true;
    }
  } catch (e) {
    console.log('preview-join-button selector failed:', e);
  }

  // Method 2: XPath you provided
  try {
    const button = document.evaluate(
      '/html/body/div[2]/div[2]/div/div[1]/div/div[2]/button',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (button) {
      console.log('✓ Found button via your XPath, clicking...');
      button.click();
      joinButtonClicked = true;
      return true;
    }
  } catch (e) {
    console.log('XPath button search failed:', e);
  }

  // Method 3: Find by button type and text
  try {
    const buttons = document.querySelectorAll('button[type="submit"]');
    for (const btn of buttons) {
      if (btn.textContent.trim().toLowerCase() === 'join') {
        console.log('✓ Found Join button via submit type, clicking...');
        btn.click();
        joinButtonClicked = true;
        return true;
      }
    }
  } catch (e) {}

  console.log('Join button not found yet...');
  return false;
};

// Click "Join Audio by Computer" button (from Playwright)
const clickJoinAudioButton = () => {
  if (audioButtonClicked) return false;

  console.log('Looking for Join Audio by Computer button...');

  // Method 1: Exact XPath from Playwright
  try {
    const button = document.evaluate(
      '//button[text()="Join Audio by Computer"]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (button) {
      console.log('✓ Found "Join Audio by Computer" button, clicking...');
      button.click();
      audioButtonClicked = true;
      return true;
    }
  } catch (e) {
    console.log('Join Audio XPath failed:', e);
  }

  // Method 2: Search all buttons for audio text
  try {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      if (text.includes('join audio') || text.includes('join by computer')) {
        console.log('✓ Found audio button by text search, clicking...');
        btn.click();
        audioButtonClicked = true;
        return true;
      }
    }
  } catch (e) {}

  console.log('Audio button not found yet...');
  return false;
};

// Main auto-join function
const runAutoJoin = () => {
  clickAcceptCookies();
  clickAgreeButton();

  if (!joinButtonClicked) {
    clickPreviewJoinButton();
  }

  if (joinButtonClicked && !audioButtonClicked) {
    clickJoinAudioButton();
  }
};

// Wait for page to be ready, then start clicking
const waitAndClick = () => {
  // Wait for input fields to ensure page is loaded
  const checkReady = setInterval(() => {
    const nameInput = document.querySelector('input[type="text"]');
    if (nameInput) {
      console.log('Page ready, starting auto-join...');
      clearInterval(checkReady);
      runAutoJoin();
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkReady), 10000);
};

// Start immediately
waitAndClick();

// Aggressive retry schedule
setTimeout(() => {
  console.log('=== Retry 1 (2s) ===');
  runAutoJoin();
}, 2000);

setTimeout(() => {
  console.log('=== Retry 2 (3s) ===');
  runAutoJoin();
}, 3000);

setTimeout(() => {
  console.log('=== Retry 3 (4s) ===');
  runAutoJoin();
}, 4000);

setTimeout(() => {
  console.log('=== Retry 4 (5s) ===');
  runAutoJoin();
}, 5000);

setTimeout(() => {
  console.log('=== Audio retry (8s) ===');
  clickJoinAudioButton();
}, 8000);

setTimeout(() => {
  console.log('=== Audio retry (12s) ===');
  clickJoinAudioButton();
}, 12000);

setTimeout(() => {
  console.log('=== Audio retry (18s) ===');
  clickJoinAudioButton();
}, 18000);

// Watch for DOM changes
const observer = new MutationObserver(() => {
  if (!joinButtonClicked || !audioButtonClicked) {
    runAutoJoin();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Auto-join active - monitoring page...');
