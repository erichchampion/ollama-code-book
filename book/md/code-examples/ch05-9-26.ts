/**
 * Rich terminal output consumer
 */
export class RichTerminalConsumer implements StreamConsumer {
  private formatter = new TerminalFormatter();
  private contentBuffer = '';
  private spinnerInterval?: NodeJS.Timeout;
  private toolsInProgress = new Map<string, string>();

  onEvent(event: AnyStreamEvent): void {
    switch (event.type) {
      case StreamEventType.METADATA:
        console.log(this.formatter.info(
          `Using ${event.metadata.model || 'AI model'}`
        ));
        break;

      case StreamEventType.CONTENT:
        // Stop spinner if active
        this.stopSpinner();

        // Write content
        process.stdout.write(event.content);
        this.contentBuffer += event.content;
        break;

      case StreamEventType.TOOL_START:
        this.startTool(event);
        break;

      case StreamEventType.TOOL_PROGRESS:
        this.updateToolProgress(event);
        break;

      case StreamEventType.TOOL_COMPLETE:
        this.completeTool(event);
        break;

      case StreamEventType.TOOL_ERROR:
        this.errorTool(event);
        break;

      case StreamEventType.DONE:
        console.log('\n');
        console.log(this.formatter.success(
          `Complete in ${event.metadata?.durationMs}ms`
        ));
        break;

      case StreamEventType.ERROR:
        console.log('\n');
        console.log(this.formatter.error(
          `Error: ${event.error.message}`
        ));
        break;
    }
  }

  private startTool(event: ToolStartEvent): void {
    this.stopSpinner();
    console.log('\n');

    const message = `${this.formatter.spinner()} Executing: ${event.toolName}`;
    console.log(message);

    this.toolsInProgress.set(event.toolId, message);

    // Start animated spinner
    this.spinnerInterval = setInterval(() => {
      this.formatter.clearLine();
      const msg = `${this.formatter.spinner()} Executing: ${event.toolName}`;
      process.stdout.write(msg);
    }, 80);
  }

  private updateToolProgress(event: ToolProgressEvent): void {
    this.stopSpinner();
    this.formatter.clearLine();

    const bar = this.renderProgressBar(event.progress);
    const message = event.message ? ` ${event.message}` : '';
    process.stdout.write(`${bar}${message}`);
  }

  private completeTool(event: ToolCompleteEvent): void {
    this.stopSpinner();
    this.formatter.clearLine();

    console.log(this.formatter.success(
      `${event.toolId} (${event.durationMs}ms)`
    ));

    this.toolsInProgress.delete(event.toolId);
  }

  private errorTool(event: ToolErrorEvent): void {
    this.stopSpinner();
    this.formatter.clearLine();

    console.log(this.formatter.error(
      `${event.toolId}: ${event.error.message}`
    ));

    this.toolsInProgress.delete(event.toolId);
  }

  private renderProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(0)}%`;
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }
  }

  onComplete(): void {
    this.stopSpinner();
  }

  onError(error: Error): void {
    this.stopSpinner();
    console.log('\n');
    console.log(this.formatter.error(`Stream failed: ${error.message}`));
  }
}