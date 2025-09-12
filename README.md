# 🚀 IDK

> A platform for training and deploying LLMs.

---

<p align="center">
  <img src="./.github/assets/supabase.svg" alt="Supabase Logo" title="Supabase" height="40"/>
  <span style="font-size:2rem;vertical-align:middle;">&nbsp; + &nbsp;</span>
  <img src="./.github/assets/biome.svg" alt="Biome Logo" title="Biome" height="40"/>
</p>
<p align="center"><em>Powered by Supabase &amp; Biome</em></p>

<p align="center">
  <a href="https://supabase.com/"> <img src="https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?logo=supabase&logoColor=white" alt="Supabase Badge"/> </a>
  <a href="https://biomejs.dev/"> <img src="https://img.shields.io/badge/Code%20Style-Biome-1B1F23?logo=biome&logoColor=white" alt="Biome Badge"/> </a>
  <a href="https://pnpm.io/"> <img src="https://img.shields.io/badge/Package%20Manager-pnpm-F69220?logo=pnpm&logoColor=white" alt="pnpm Badge"/> </a>
</p>

---

## 🛠️ Tech Stack

- **[Biome](https://biomejs.dev/)** &nbsp;:art: — Code formatting and linting
- **[Supabase](https://supabase.com/)** &nbsp;:elephant: — Backend database & authentication
- **pnpm** &nbsp;:package: — Fast, disk space efficient package manager

---

## 🚦 Getting Started

### 1️⃣ Install Supabase CLI
- Follow the [Supabase CLI Installation Guide](https://supabase.com/docs/guides/cli) for your platform.

### 2️⃣ Start Supabase
```sh
supabase start
```

### 3️⃣ Install Dependencies
```sh
pnpm install
```

### 4️⃣ Start the Development Server
```sh
pnpm dev
```

### 5️⃣ Run Examples
Run any of the examples in the `examples` directory with the following command:

```sh
pnpm tsx ./path/to/example.ts
```
---

## 🔑 Default Password

```
idk
```

---

## 📝 AI Providers Status

### Chat Completion API

| AI Provider      | Messages | Streaming | Tool Calls | JSON Output | Structured Output | MCP Servers |
| ---------------- | -------- | --------- | ---------- | ----------- | ----------------- | ------------- |
| Anthropic        | ✅       | 🟡        | ✅         | ✅          | ⬛                | ⬛            |
| Azure AI Foundry | ✅       | ⬛        | ✅         | ✅          | ✅                | ⬛            |
| Azure OpenAI     | ✅       | ⬛        | ✅         | ✅          | ✅                | ⬛            |
| OpenAI           | ✅       | ⬛        | ✅         | ✅          | ✅                | ⬛            |
| Gemini (Google)  | ✅       | ⬛        | ✅         | ✅          | ⬛                | ⬛            |
| XAI              | ✅       | ⬛        | ✅         | ✅          | ✅                | ⬛            |

### Responses API

| AI Provider      | API Support | Messages | Tool Calls | JSON Output | Structured Output | MCP Servers |
| ---------------- | ----------- | -------- | ---------- | ----------- | ----------------- | ------------- |
| Anthropic        | 🔴          | 🔴       | 🔴         | 🔴          | 🔴                | 🔴            |
| Azure AI Foundry | ⬛          | ⬛       | ⬛         | ⬛          | ⬛                | ⬛            |
| Azure OpenAI     | ✅          | ✅       | ✅         | ✅          | ✅                | ✅            |
| OpenAI           | ✅          | ✅       | ✅         | ✅          | ✅                | ✅            |
| Gemini (Google)  | 🔴          | 🔴       | 🔴         | 🔴          | 🔴                | 🔴            |
| XAI              | ✅          | ✅       | ✅         | ✅          | ✅                | ✅            |

- ✅: Fully supported
- 🟡: Partial support (configuration exists but has known issues)
- ⬛: Not yet implemented

### Notes
- **Anthropic Streaming**: Configuration exists but currently returns 500 errors due to server-side issues
- **Responses API**: Only OpenAI-compatible providers (OpenAI, Azure OpenAI, XAI) support the Responses API

## 📚 Learn More
- [Supabase Documentation](https://supabase.com/docs)
- [Biome Documentation](https://biomejs.dev/docs/)
- [pnpm Documentation](https://pnpm.io/motivation)
- [Contributing Guide](CONTRIBUTING.md)

---

## 💡 Inspiration

This project was inspired by the amazing work at [Portkey-AI/gateway](https://github.com/Portkey-AI/gateway), a blazing fast AI Gateway with integrated guardrails and support for 200+ LLMs.

We use MIT-licensed code from Portkey-AI/gateway in this project and gratefully acknowledge their contribution.

---

<p align="center">
  <b>Made with ❤️ by the IDK team</b>
</p>
