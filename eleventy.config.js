export default function (eleventyConfig) {
  // public/ ve app/ altındaki dosyalar aynı yol yapısıyla sitenin köküne kopyalanır.
  // CSS içindeki url(/build/assets/...) referansları bu sayede değiştirilmeden çalışır.
  // app/ içindeki auth/dashboard/admin dosyaları da build çıktısına dahil edilir.
  eleventyConfig.addPassthroughCopy({ public: "/", app: "/app" });

  eleventyConfig.setServerOptions({
    // /about-us gibi uzantısız adresleri about-us/index.html'e yönlendirir
    showAllHosts: false,
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["njk", "html", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
