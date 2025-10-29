# 🏗️ User Preferences Architecture

## 📋 Overview

Hệ thống quản lý tùy chọn người dùng (ngôn ngữ, giao diện) với 3 tầng lưu trữ:

```
┌─────────────────────────────────────────────────┐
│  🎯 Single Source of Truth: localStorage        │
│  - language: 'vi' | 'en'                        │
│  - theme: 'light' | 'dark'                      │
└─────────────────────────────────────────────────┘
           │
           ├──► 📦 Cache Layer: user_settings_{id}
           │    {language, theme, notifications, ...}
           │
           └──► 💾 Database: Users table
                (language, theme columns)
```

---

## 🔄 Data Flow

### 1️⃣ **User Changes Preference** (UserProfile.html)

```javascript
// User clicks language dropdown → onChange event
langSel.onchange = async () => {
  const newLang = langSel.value; // 'en' or 'vi'
  
  // STEP 1: Save to localStorage IMMEDIATELY
  localStorage.setItem('language', newLang);
  
  // STEP 2: Apply to UI (NO reload)
  LanguageService.setLanguage(newLang);
  
  // STEP 3: Save to database (background)
  await fetch('/api/users/{id}/preferences', {
    method: 'PUT',
    body: { language: newLang, theme: currentTheme }
  });
  
  // STEP 4: Update cache
  const cache = { ...userSettings, language: newLang };
  localStorage.setItem('user_settings_{id}', JSON.stringify(cache));
};
```

**Priority:** localStorage > cache > database

---

### 2️⃣ **Page Loads** (All pages)

```javascript
// language.js - Auto-initialization
LanguageService.init() {
  // Read from localStorage (single source of truth)
  const lang = localStorage.getItem('language') || 'vi';
  this._applyLanguage(lang);
}
```

**Result:** Instant language application, no flickering!

---

### 3️⃣ **UserProfile Page Loads** (UserProfile.html)

```javascript
async loadUserSettings() {
  const masterLanguage = localStorage.getItem('language');
  const masterTheme = localStorage.getItem('theme');
  
  // PHASE 1: Load from cache (instant display)
  const cache = localStorage.getItem('user_settings_{id}');
  if (cache) {
    userSettings = JSON.parse(cache);
    
    // ✅ Override with master values (localStorage wins)
    if (masterLanguage) userSettings.language = masterLanguage;
    if (masterTheme) userSettings.theme = masterTheme;
    
    // Apply immediately
    applyTheme(userSettings.theme);
    LanguageService.setLanguage(userSettings.language);
  }
  
  // PHASE 2: Fetch from database (background sync)
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  
  // Merge with localStorage (localStorage has priority)
  const finalLanguage = masterLanguage || data.user.language;
  const finalTheme = masterTheme || data.user.theme;
  
  // Update cache
  localStorage.setItem('user_settings_{id}', JSON.stringify({
    language: finalLanguage,
    theme: finalTheme,
    // ... other settings
  }));
  
  // Sync localStorage
  localStorage.setItem('language', finalLanguage);
  localStorage.setItem('theme', finalTheme);
}
```

**Result:** Page loads with cached data first (instant), then syncs with database!

---

## 📊 Storage Comparison

| Storage Location | Key | Value | Priority | Purpose |
|-----------------|-----|-------|----------|---------|
| `localStorage` | `language` | `'vi'` \| `'en'` | **🥇 Highest** | Master value |
| `localStorage` | `theme` | `'light'` \| `'dark'` | **🥇 Highest** | Master value |
| `localStorage` | `user_settings_{id}` | `{ language, theme, ... }` | 🥈 Medium | Fast cache |
| `Database` | `Users.language` | `'vi'` \| `'en'` | 🥉 Lowest | Persistent storage |
| `Database` | `Users.theme` | `'light'` \| `'dark'` | 🥉 Lowest | Persistent storage |

---

## ✅ Benefits

### 1. **No Page Reload Needed**
- Language/theme changes apply **instantly**
- Form data **NOT lost**
- Professional UX like modern websites

### 2. **Instant Page Loads**
- Cache loads **before API call**
- No flickering or layout shifts
- Perceived performance boost

### 3. **Data Consistency**
- Single source of truth: `localStorage.language/theme`
- Cache auto-syncs with master values
- Database is backup/cross-device sync

### 4. **Offline Support**
- Works without internet (uses cache)
- Syncs when connection restored
- Graceful degradation

---

## 🧪 Test Scenarios

### Scenario 1: Change Language
1. User clicks "English" in dropdown
2. **Result:** Page translates instantly (NO reload)
3. Form data preserved ✅
4. Reload page → Still English ✅

### Scenario 2: Page Reload After Language Change
1. User changed language to English
2. User reloads page (F5)
3. **Flow:**
   - LanguageService reads `localStorage.language = 'en'`
   - Applies English immediately
   - UserProfile loads cache → overrides with `localStorage.language`
   - API returns data → syncs with `localStorage.language`
4. **Result:** English maintained across reload ✅

### Scenario 3: Navigate to Another Page
1. User on Settings page (English)
2. User clicks "Contact Support"
3. **Flow:**
   - ContactSupport.html loads
   - LanguageService.init() reads `localStorage.language = 'en'`
   - Applies English
4. **Result:** English maintained across navigation ✅

### Scenario 4: Open New Tab
1. User has Settings page open (English)
2. User opens new tab → goes to HomePage
3. **Flow:**
   - HomePage loads
   - LanguageService reads `localStorage.language = 'en'`
4. **Result:** English in new tab ✅

### Scenario 5: Database Out of Sync
1. Database has `language = 'vi'`
2. localStorage has `language = 'en'` (user just changed)
3. **Flow:**
   - Cache loads: `{ language: 'vi' }`
   - Override with localStorage: `language = 'en'`
   - API returns: `{ language: 'vi' }`
   - Merge with localStorage priority: `finalLanguage = 'en'`
   - Update cache: `{ language: 'en' }`
4. **Result:** localStorage wins, UI shows English ✅

---

## 🔧 Implementation Details

### localStorage Keys

```javascript
// Master values (single source of truth)
localStorage.setItem('language', 'en');
localStorage.setItem('theme', 'dark');

// Cache (for fast loading)
localStorage.setItem('user_settings_1', JSON.stringify({
  language: 'en',
  theme: 'dark',
  notify_event_updates: true,
  notify_new_events: true,
  notify_reminders: true,
  two_factor_enabled: false
}));
```

### Database Schema

```sql
ALTER TABLE Users
ADD language NVARCHAR(10) DEFAULT 'vi' NOT NULL,
    theme NVARCHAR(10) DEFAULT 'light' NOT NULL;
```

### API Endpoints

```javascript
// GET /api/users/:id
// Returns: { user: { language, theme, ... } }

// PUT /api/users/:id/preferences
// Body: { language, theme }
// Updates database, returns success
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Language Reverts on Reload
**Cause:** Cache has old value, overrides localStorage  
**Solution:** ✅ Always override cache with localStorage master values

### Issue 2: Form Data Lost on Language Change
**Cause:** Page reload after language change  
**Solution:** ✅ Apply language instantly via LanguageService (NO reload)

### Issue 3: Different Language Across Tabs
**Cause:** No cross-tab sync  
**Solution:** ✅ Storage event listener (already implemented in language.js)

### Issue 4: Database Has Wrong Value
**Cause:** API failed during save  
**Solution:** ✅ localStorage is master, database is backup

---

## 📝 Best Practices

1. **Always save to localStorage first** (instant feedback)
2. **Update cache, don't delete** (faster subsequent loads)
3. **localStorage > cache > database** (priority order)
4. **Never reload page for preference changes** (modern UX)
5. **Show toast notification** (user confirmation)
6. **Log every step** (easier debugging)

---

## 🎯 Future Enhancements

- [ ] Server-side sync for cross-device preferences
- [ ] Preference versioning (detect conflicts)
- [ ] A/B testing for UI variants
- [ ] Analytics for preference patterns
- [ ] Export/import preferences

---

**Last Updated:** October 19, 2025  
**Architecture Version:** 2.0  
**Status:** ✅ Production Ready
