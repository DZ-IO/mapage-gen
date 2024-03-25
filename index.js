#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import markdownit from "markdown-it";
import { join } from "path";
import { Eta } from "eta";
import { existsSync } from "fs";
const md = markdownit({ html: true });
const eta = new Eta({ views: ".mapage/template" });
async function randerMD(src, dest) {
  let fileContent = String(await readFile(src));
  fileContent = fileContent.replace(".md", ".html");
  let title = fileContent.split("\n")[0].split("# ")[1];
  fileContent = md.render(fileContent);
  fileContent = eta.render("./template", {
    body: fileContent,
    title: title,
    date: new Date(),
  });
  return writeFile(dest, fileContent);
}
let dist = "dist";
// 遍历文件夹
readdir(".", { recursive: true, withFileTypes: true })
  // ignore机制
  .then((val) =>
    (async function (val) {
      let ignore = [
        /^\.git/,
        /^\.mapage/,
        /^dist/,
        /^node_modules/,
        /^package.json$/,
        /^package-lock.json$/,
      ];
      let ignfile = join(".mapage", "ignore");
      if (existsSync(ignfile)) {
        let ignfileContent = String(await readFile(ignfile)).split("\n");
        if (ignfileContent.length != 0) ignore = ignore.concat();
      }
      return val.filter((e) => {
        try {
          ignore.forEach((r) => {
            if (join(e.path, e.name).match(new RegExp(r))) throw 0;
          });
        } catch (n) {
          return false;
        }
        return true;
      });
    })(val)
  )
  // 创建文件夹
  .then((val) =>
    (async function (val) {
      let task = [];
      val = val.filter((e) => {
        if (e.isDirectory()) {
          task.push(mkdir(join(dist, e.path, e.name), { recursive: true }));
          return false;
        } else return true;
      });
      await Promise.all(task);
      return val;
    })(val)
  )
  // 渲染markdown
  .then((val) =>
    (async function (val) {
      let task = [];
      val = val.filter((e) => {
        if (e.isFile() && e.name.match(/.md$/)) {
          let src = join(e.path, e.name);
          let dest = join(dist, src);
          dest = dest.replace(".md", ".html");
          dest = dest.replace("README.html", "index.html");
          task.push(randerMD(src, dest));
          return false;
        } else return true;
      });
      await Promise.all(task);
      return val;
    })(val)
  )
  // 处理文件
  .then((val) => {
    let task = [];
    val.forEach((e) => {
      let src = join(e.path, e.name);
      let dest = join(dist, src);
      task.push(copyFile(src, dest));
    });
    return Promise.all(task);
  })
  .catch(console.error);
