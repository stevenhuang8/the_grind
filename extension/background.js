'use strict'

// Open the side panel when the user clicks the extension toolbar icon.
// The side panel stays open across tab switches and outside clicks.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error)
})
