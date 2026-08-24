import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectTemplate } from '@biiig/shared';

@Injectable()
export class TemplatesService implements OnModuleInit {
  private templates: ProjectTemplate[] = [];

  async onModuleInit() {
    this.templates = await this.loadTemplates();
  }

  private async loadTemplates(): Promise<ProjectTemplate[]> {
    const candidates = [
      process.env.TEMPLATES_JSON_PATH,
      path.join(process.cwd(), 'templates', 'templates.json'),
      path.join(__dirname, '..', '..', '..', '..', 'templates', 'templates.json'),
      path.join(__dirname, '..', '..', '..', '..', '..', '..', 'templates', 'templates.json'),
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as ProjectTemplate[];
      } catch {
        // try next candidate
      }
    }
    throw new NotFoundException('templates.json not found in any candidate path');
  }

  async list(category?: string) {
    return this.templates
      .filter((t) => !category || t.category === category)
      .map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        framework: t.framework,
        language: t.language,
        parameters: t.parameters,
      }));
  }

  async get(id: string) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async generate(id: string, params: Record<string, string>, targetPath: string) {
    const template = await this.get(id);

    await fs.mkdir(targetPath, { recursive: true });

    for (const file of template.files) {
      let content = file.content;
      let filePath = file.path;

      for (const [key, value] of Object.entries(params)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
        filePath = filePath.replace(regex, value);
      }

      const fullPath = path.join(targetPath, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    return {
      success: true,
      templateId: id,
      targetPath,
      generatedFiles: template.files.map((f) => f.path),
    };
  }
}
