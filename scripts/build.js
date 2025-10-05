const fs = require('fs-extra');
const path = require('path');

// Import generators
const { generateHTML } = require('./generate/html');
const { generateSEO } = require('./generate/seo');
const generateSitemap = require('./generate/sitemap');
const generateRedirects = require('./generate/redirects');

class BuildSystem {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.publicDir = path.join(process.cwd(), 'public');
    this.srcDir = path.join(process.cwd(), 'src');
    
    this.projektyData = null;
    this.geoData = null;
  }

  async init() {
    console.log('🏗️  Initializing build system...');
    
    // Ensure directories exist
    await fs.ensureDir(this.publicDir);
    await fs.ensureDir(path.join(this.publicDir, 'assets'));
    await fs.ensureDir(path.join(this.publicDir, 'projekty'));
    
    // Load data
    await this.loadData();
  }

  async loadData() {
    console.log('📊 Loading project data...');
    
    try {
      // Load main project data
      const projektyPath = path.join(this.dataDir, 'projekty.json');
      if (await fs.pathExists(projektyPath)) {
        const rawData = await fs.readJson(projektyPath);
        this.projektyData = rawData;
        console.log(`✅ Loaded ${rawData.metadata?.totalProjects || rawData.projects?.length || 0} projects`);
      }
      
      // Load GeoJSON data
      const geoPath = path.join(this.dataDir, 'projekty.geo.json');
      if (await fs.pathExists(geoPath)) {
        this.geoData = await fs.readJson(geoPath);
        console.log(`✅ Loaded ${this.geoData.features?.length || 0} geo features`);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      throw error;
    }
  }

  async copyDataFiles() {
    console.log('📁 Copying data files to public...');
    
    // Copy data files to public directory for frontend access
    const sourceDir = this.dataDir;
    const targetDir = path.join(this.publicDir, 'data');
    
    await fs.ensureDir(targetDir);
    await fs.copy(sourceDir, targetDir, {
      filter: (src) => {
        // Only copy JSON files, not cache or temp files
        return !src.includes('.cache') && !src.includes('project-urls.txt');
      }
    });
    
    console.log('✅ Data files copied to public/data/');
  }

  async copyAssets() {
    console.log('📂 Copying frontend assets...');
    
    // Copy JavaScript files
    const srcDir = path.join(process.cwd(), 'src');
    const targetSrcDir = path.join(this.publicDir, 'src');
    
    await fs.ensureDir(targetSrcDir);
    
    if (await fs.pathExists(srcDir)) {
      await fs.copy(srcDir, targetSrcDir, {
        filter: (src) => {
          // Only copy JS files
          return src.endsWith('.js') || fs.statSync(src).isDirectory();
        }
      });
      console.log('✅ JavaScript files copied to public/src/');
    }
  }

  async generatePages() {
    console.log('📄 Generating HTML pages...');

    if (!this.projektyData) {
      throw new Error('No project data available for page generation');
    }

    // Clean up old project HTML files before generating new ones
    const projektyDir = path.join(this.publicDir, 'projekty');
    if (await fs.pathExists(projektyDir)) {
      console.log('🧹 Cleaning up old project HTML files...');
      await fs.emptyDir(projektyDir);
      console.log('✅ Old project files removed');
    }

    // Generate main pages
    await generateHTML.generateMapPage(this.projektyData, this.publicDir);
    
    // Generate individual project pages (for SEO)
    if (this.projektyData.projects) {
      console.log(`📋 Generating ${this.projektyData.projects.length} individual project pages...`);
      
      let generated = 0;
      for (const project of this.projektyData.projects) {
        if (project.id && project.nazwa) {
          try {
            await generateHTML.generateProjectPage(project, this.publicDir);
            generated++;
            
            // Progress indicator
            if (generated % 50 === 0) {
              console.log(`   Generated ${generated}/${this.projektyData.projects.length} project pages`);
            }
          } catch (error) {
            console.warn(`⚠️  Failed to generate page for project ${project.id}:`, error.message);
          }
        }
      }
      
      console.log(`✅ Generated ${generated} project detail pages`);
    }
  }

  async generateSEOFiles() {
    console.log('🔍 Generating SEO files...');

    if (!this.projektyData) {
      throw new Error('No project data available for SEO generation');
    }

    // Generate sitemap
    await generateSitemap(this.projektyData, this.publicDir);

    // Generate redirects for old URLs
    await generateRedirects(this.projektyData, this.publicDir);

    // Generate additional SEO metadata
    await generateSEO.generateMetaTags(this.projektyData, this.publicDir);

    console.log('✅ SEO files generated');
  }

  async generateAssets() {
    console.log('🎨 Processing assets...');
    
    // For now, we'll create placeholder assets
    // In a full implementation, this would handle CSS compilation, image optimization, etc.
    
    const assetsDir = path.join(this.publicDir, 'assets');
    await fs.ensureDir(assetsDir);
    
    // Create a basic favicon placeholder
    const faviconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="#FFFFFF" stroke="#333" stroke-width="1"/>
      <text x="16" y="20" text-anchor="middle" font-family="system-ui" font-size="14" fill="#333">Ł</text>
    </svg>`;
    
    await fs.writeFile(path.join(this.publicDir, 'favicon.svg'), faviconContent);
    
    console.log('✅ Basic assets created');
  }

  async build() {
    try {
      console.log('🚀 Starting build process...\n');
      
      await this.init();
      await this.copyDataFiles();
      await this.copyAssets();
      await this.generatePages();
      await this.generateSEOFiles();
      await this.generateAssets();
      
      console.log('\n🎉 Build completed successfully!');
      
      // Print summary
      const projects = this.projektyData?.projects?.length || 0;
      const geoFeatures = this.geoData?.features?.length || 0;
      
      console.log('\n📊 Build Summary:');
      console.log(`   • Projects: ${projects}`);
      console.log(`   • Geo features: ${geoFeatures}`);
      console.log(`   • Pages generated: index.html, ${projects} project pages`);
      console.log(`   • SEO: sitemap.xml, robots.txt, meta tags`);
      console.log(`   • Ready for deployment to Vercel`);
      
    } catch (error) {
      console.error('\n❌ Build failed:', error);
      process.exit(1);
    }
  }
}

// Run build if called directly
if (require.main === module) {
  const buildSystem = new BuildSystem();
  buildSystem.build();
}

module.exports = BuildSystem;