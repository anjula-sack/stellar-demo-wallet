import { h } from '@stencil/core'

import loggedInContent from '../views/loggedInContent'
import loggedOutContent from '../views/loggedOutContent'

export default function () {
  const popup = this.promptContents ? (
    <div class="popup">{this.promptContents}</div>
  ) : null
  return [
    <stellar-prompt prompter={this.prompter} />,
    popup,
    this.account ? loggedInContent.call(this) : loggedOutContent.call(this),
    this.error ? (
      <pre class="error">{JSON.stringify(this.error, null, 2)}</pre>
    ) : null,
  ]
}
