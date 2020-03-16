import * as core from '@actions/core'
import path from 'path'
import fs from 'fs'
import tmp from 'tmp'

async function run(): Promise<void> {
  try {
    // Get inputs
    const targetsFile = core.getInput('targets', {required: true})
    const targetId = core.getInput('target-id', {required: true})
    const targetArn = core.getInput('task-definition', {required: true})

    // Parse the task definition
    const targetsPath = path.isAbsolute(targetsFile)
      ? targetsFile
      : path.join(process.env.GITHUB_WORKSPACE || '', targetsFile)
    if (!fs.existsSync(targetsPath)) {
      throw new Error(`Targets file does not exist: ${targetsFile}`)
    }
    const fileContents = fs.readFileSync(targetsPath, 'utf8')
    const targetsContents = JSON.parse(fileContents)

    // Insert the target ARN
    if (!Array.isArray(targetsContents.Targets)) {
      throw new Error(
        'Invalid targets format: Targets section is not present or is not an array'
      )
    }
    const targetDef = targetsContents.Targets.find(function(element: unknown) {
      return (element as {Id?: string}).Id === targetId
    })
    if (!targetDef) {
      throw new Error('Invalid targets: Could not find target with matching id')
    }
    targetDef.EcsParameters.TaskDefinitionArn = targetArn

    // Write out a new targets file
    const updatedTargetsFile = tmp.fileSync({
      dir: process.env.RUNNER_TEMP,
      prefix: 'targets-',
      postfix: '.json',
      keep: true,
      discardDescriptor: true
    })
    const newTargetsContents = JSON.stringify(targetsContents, null, 2)
    fs.writeFileSync(updatedTargetsFile.name, newTargetsContents)
    core.setOutput('targets', updatedTargetsFile.name)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
