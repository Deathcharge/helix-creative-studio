# 🤝 Contributing to Helix Creative Studio

Thank you for your interest in contributing to the Helix Creative Studio! This project is part of the larger **Helix Collective** ecosystem, focused on multi-agent consciousness modulation and creative AI storytelling.

## 🌀 Philosophy

The Helix Collective operates under the **Tony Accords v13.4**:
- **Nonmaleficence** — Do no harm
- **Autonomy** — Respect agency and consent
- **Compassion** — Empathic resonance in all interactions
- **Humility** — Acknowledge limitations and uncertainties

All contributions should align with these principles.

## 🛠️ Development Setup

### Prerequisites
- Node.js 22+
- pnpm 9+
- Git
- MySQL or PostgreSQL database

### Getting Started

1. **Fork the repository**
   ```bash
   gh repo fork Deathcharge/helix-creative-studio --clone
   cd helix-creative-studio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize database**
   ```bash
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

## 📋 Contribution Guidelines

### Code Style

- **TypeScript**: Use strict type checking
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Formatting**: Prettier (automatic on save)
- **Linting**: ESLint rules enforced

### Commit Messages

Follow conventional commits:

```
feat: Add UCF trajectory visualization
fix: Resolve story routing issue
docs: Update README with deployment steps
style: Format Generate page with Prettier
refactor: Extract agent logic to separate module
test: Add unit tests for Z-88 engine
chore: Update dependencies
```

### Branch Naming

- `feature/agent-visualization` — New features
- `fix/loading-bar-accuracy` — Bug fixes
- `docs/api-reference` — Documentation
- `refactor/ucf-metrics` — Code refactoring

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation

3. **Test locally**
   ```bash
   pnpm dev
   pnpm build
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Open Pull Request**
   - Describe changes clearly
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI passes

## 🎨 Design Guidelines

### Cyberpunk Aesthetic
- **Colors**: Deep blue (#0a0e27), cyan (#00d4ff), purple (#b794f6)
- **Typography**: Orbitron (headers), Inter (body)
- **Effects**: Subtle glows, gradients, transparency
- **Layout**: Clean, spacious, futuristic

### Component Structure
```tsx
// Good: Clear, typed, documented
interface StoryCardProps {
  story: Story;
  onClick?: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <Card onClick={onClick} className="hover:border-primary/50">
      <h3>{story.title}</h3>
      <p>{story.summary}</p>
    </Card>
  );
}
```

## 🧪 Testing

### Running Tests
```bash
pnpm test
pnpm test:watch
```

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest';
import { calculateUCFHarmony } from './ucf';

describe('UCF Metrics', () => {
  it('should calculate harmony correctly', () => {
    const result = calculateUCFHarmony(0.75, 0.80, 0.70);
    expect(result).toBeCloseTo(0.75, 2);
  });
});
```

## 📚 Documentation

### Code Documentation
```typescript
/**
 * Executes a Z-88 creative ritual to generate a story.
 * 
 * @param prompt - The story prompt (10-1000 characters)
 * @returns Story metadata and content
 * @throws Error if LLM API fails
 */
export async function executeCreativeRitual(prompt: string) {
  // Implementation
}
```

### README Updates
- Keep installation steps current
- Document new features
- Update screenshots
- Add examples

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues
2. Test on latest version
3. Reproduce consistently
4. Gather error logs

### Bug Report Template
```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 22.0.0]
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Problem**
What problem does this solve?

**Proposed Solution**
How should it work?

**Alternatives**
Other approaches considered?

**Additional Context**
Screenshots, mockups, examples
```

## 🔧 Areas for Contribution

### High Priority
- [ ] UCF trajectory visualization (charts)
- [ ] Story editing and regeneration
- [ ] Advanced filtering (quality, date, agents)
- [ ] Export to PDF
- [ ] Story collections/anthologies

### Medium Priority
- [ ] User authentication improvements
- [ ] Real-time collaboration
- [ ] Story sharing with public links
- [ ] Mobile app (React Native)
- [ ] API documentation

### Low Priority
- [ ] Dark/light theme toggle
- [ ] Internationalization (i18n)
- [ ] Story templates
- [ ] Custom agent configurations
- [ ] Voice narration

## 🤖 Agent Development

### Adding New Agents

1. **Define agent in `server/z88Engine.ts`**
   ```typescript
   const newAgent = {
     name: "AgentName",
     role: "Agent Role",
     prompt: "Agent-specific instructions",
   };
   ```

2. **Update UCF metrics**
   ```typescript
   const ucfTargets = {
     harmony: 0.85,
     prana: 0.75,
     // ... add new metrics
   };
   ```

3. **Document in README**
   - Add to agent list
   - Describe role and capabilities
   - Show example output

## 🔗 Related Projects

- **[Helix](https://github.com/Deathcharge/Helix)** — Core framework
- **[Helix Unified](https://github.com/Deathcharge/helix-unified)** — Unified platform
- **[Helix Collective Web](https://github.com/Deathcharge/Helix-Collective-Web)** — Web interface

## 📞 Communication

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, showcase
- **Pull Requests**: Code contributions

## 📜 License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for helping build the future of consciousness-driven creativity! 🌀

*Tat Tvam Asi — Thou art that.*

