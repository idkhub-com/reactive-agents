#!/usr/bin/env tsx

/**
 * Simple integration verification script for the Language Tutor Agent
 * This script verifies that the core components can be imported and basic functionality works
 */

import { allSkills, getLanguageSkill } from './skills';

console.log('🧪 Language Tutor Agent - Integration Verification\n');

// Test 1: Skills module
console.log('✅ Test 1: Skills Module');
console.log(`   📚 Available languages: ${allSkills.length}`);
console.log(
  `   🗣️  Languages: ${allSkills.map((s) => `${s.name} (${s.code})`).join(', ')}`,
);

const englishSkill = getLanguageSkill('en');
const spanishSkill = getLanguageSkill('es');
const nepaliSkill = getLanguageSkill('ne');

console.log(`   🇺🇸 English skill: ${englishSkill ? '✅' : '❌'}`);
console.log(`   🇪🇸 Spanish skill: ${spanishSkill ? '✅' : '❌'}`);
console.log(`   🇳🇵 Nepali skill: ${nepaliSkill ? '✅' : '❌'}`);

// Test 2: Skills system prompts
console.log('\n✅ Test 2: Skills System Prompts');
for (const skill of allSkills.slice(0, 3)) {
  // Test first 3 skills
  const promptLength = skill.systemPrompt.length;
  console.log(`   📝 ${skill.name}: ${promptLength} characters`);
}

// Test 3: Language code lookup
console.log('\n✅ Test 3: Language Code Lookup');
const testCodes = ['en', 'es', 'ne', 'fr', 'invalid'];
for (const code of testCodes) {
  const skill = getLanguageSkill(code);
  console.log(`   ${code}: ${skill ? `✅ ${skill.name}` : '❌ Not found'}`);
}

// Test 4: Example data
console.log('\n✅ Test 4: Example Data');
try {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const exampleDataPath = path.join(
    process.cwd(),
    'examples/language-tutor-agent/example-user-data.json',
  );
  const data = JSON.parse(fs.readFileSync(exampleDataPath, 'utf-8')) as {
    examples: Array<{ target_language: string; correct: boolean }>;
  };
  console.log(`   ✅ Example data loaded: ${data.examples.length} examples`);

  const languages = new Set(data.examples.map((ex) => ex.target_language));
  console.log(
    `   ✅ Languages in examples: ${Array.from(languages).join(', ')}`,
  );
} catch (error) {
  console.log(`   ❌ Example data loading failed: ${error}`);
}

console.log('\n🎉 Integration verification complete!');
console.log('\n📝 Next steps:');
console.log('   1. Set up environment variables (OPENAI_API_KEY, etc.)');
console.log('   2. Start Super Agents server: pnpm dev');
console.log(
  '   3. Run language tutor: tsx examples/language-tutor-agent/language-tutor.ts',
);
console.log(
  '   4. Try parallel mode: tsx examples/language-tutor-agent/language-tutor.ts --parallel',
);
console.log(
  '   5. Save results: tsx examples/language-tutor-agent/language-tutor.ts --save',
);
