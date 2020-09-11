'use strict';

const { promises: fs } = require('fs');
const path = require('path');

const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');
const glob = require('glob');

const converter = require('widdershins');
const { promisify } = require('util');

const parsers = [
  {
    extensions: ['.json'],
    parse: (str) => JSON.parse(str),
  },
  {
    extensions: ['.yaml', '.yml'],
    parse: (str) => yaml.safeLoad(str),
  },
];

async function parseFile(specPath) {
  const data = await fs.readFile(specPath, 'utf-8');

  const ext = path.extname(specPath);
  const parser = parsers.find(({ extensions }) => extensions.includes(ext));
  if (!parser) {
    throw new Error(`Unkown file extension ${ext}`);
  }

  return parser.parse(data);
}

async function processSpec(specPath) {
  const spec = await parseFile(specPath);

  let docs = await converter.convert(spec, {});

  // TODO: Use remark to modify the document in a more robust way
  docs = docs.substring(docs.indexOf('---', 3) + 3);
  docs = docs.replace(/> Scroll down for code samples.*/g, '');

  console.log('\n' + docs + '\n');

  const { pull_request: pullRequest } = github.context.payload;

  if (!pullRequest) {
    // TODO: Find the PR another way
    return;
  }

  await github.getOctokit(core.getInput('github-token')).issues.createComment({
    ...github.context.repo,
    issue_number: pullRequest.number,
    body: docs,
  });
}

async function main() {
  let specPaths = core.getInput('spec-paths');
  if (typeof specPaths === 'string') {
    specPaths = [specPaths];
  }

  await Promise.all(
    specPaths.map(async (specGlob) => {
      const paths = await promisify(glob)(specGlob);
      return Promise.all(paths.map(processSpec));
    })
  );
}

main().catch((err) => core.setFailed(err.message));
