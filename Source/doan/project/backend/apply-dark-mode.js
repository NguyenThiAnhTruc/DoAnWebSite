// Script tự động thêm dark mode cho tất cả các trang HTML
const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const files = [
  'HomePage.html',
  'EventList.html',
  'EventDetail.html',
  'AdminDashboard.html',
  'Login.html',
  'Register.html',
  'EventForm.html',
  'AttendanceManager.html',
  'MessagingSystem.html'
];

// Dark mode class mappings
const darkModeReplacements = [
  // Body & backgrounds
  { from: 'bg-white"', to: 'bg-white dark:bg-gray-800"' },
  { from: 'bg-gray-50"', to: 'bg-gray-50 dark:bg-gray-900"' },
  { from: 'bg-gray-100"', to: 'bg-gray-100 dark:bg-gray-800"' },
  { from: 'bg-blue-50 ', to: 'bg-blue-50 dark:bg-blue-900/20 ' },
  { from: 'bg-green-50 ', to: 'bg-green-50 dark:bg-green-900/20 ' },
  { from: 'bg-red-50 ', to: 'bg-red-50 dark:bg-red-900/20 ' },
  { from: 'bg-yellow-50 ', to: 'bg-yellow-50 dark:bg-yellow-900/20 ' },
  { from: 'bg-purple-50 ', to: 'bg-purple-50 dark:bg-purple-900/20 ' },
  
  // Text colors
  { from: 'text-gray-900"', to: 'text-gray-900 dark:text-white"' },
  { from: 'text-gray-900 ', to: 'text-gray-900 dark:text-white ' },
  { from: 'text-gray-800"', to: 'text-gray-800 dark:text-gray-100"' },
  { from: 'text-gray-700"', to: 'text-gray-700 dark:text-gray-200"' },
  { from: 'text-gray-600"', to: 'text-gray-600 dark:text-gray-300"' },
  { from: 'text-gray-500"', to: 'text-gray-500 dark:text-gray-400"' },
  
  // Borders
  { from: 'border-gray-200"', to: 'border-gray-200 dark:border-gray-700"' },
  { from: 'border-gray-300"', to: 'border-gray-300 dark:border-gray-600"' },
  
  // Hover states
  { from: 'hover:bg-gray-100 ', to: 'hover:bg-gray-100 dark:hover:bg-gray-700 ' },
  { from: 'hover:bg-gray-50 ', to: 'hover:bg-gray-50 dark:hover:bg-gray-800 ' }
];

files.forEach(filename => {
  const filePath = path.join(viewsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skip ${filename} (not found)`);
    return;
  }
  
  console.log(`📝 Processing ${filename}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dark mode config
  if (content.includes('darkMode: \'class\'')) {
    console.log(`✅ ${filename} already has dark mode config`);
    return;
  }
  
  // Add Tailwind dark mode config
  if (content.includes('<script src="https://cdn.tailwindcss.com"></script>')) {
    content = content.replace(
      '<script src="https://cdn.tailwindcss.com"></script>',
      `<script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class'
    }
  </script>`
    );
  }
  
  // Add theme.js script before </body>
  if (!content.includes('theme.js')) {
    content = content.replace(
      '</body>',
      `<script src="/js/theme.js"></script>
</body>`
    );
  }
  
  // Apply dark mode class replacements
  darkModeReplacements.forEach(({ from, to }) => {
    // Only replace if dark: variant not already present
    const regex = new RegExp(from.replace(/"/g, ''), 'g');
    content = content.replace(regex, (match) => {
      if (match.includes('dark:')) return match;
      return to.replace(/"/g, '');
    });
  });
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated ${filename}`);
});

console.log('\n🎨 Dark mode applied to all pages!');
console.log('📌 Remember to hard refresh (Ctrl+Shift+R) your browser!');
