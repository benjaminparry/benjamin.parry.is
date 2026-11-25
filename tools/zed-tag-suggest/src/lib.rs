// Starts the tag suggestion language server for a site that has scripts/tag-lsp.mjs.
// All the work is done by that script, which is plain JavaScript in the site itself.

use zed_extension_api::{self as zed, LanguageServerId, Result, Worktree};

const SCRIPT: &str = "scripts/tag-lsp.mjs";

struct TagSuggest;

impl zed::Extension for TagSuggest {
    fn new() -> Self {
        TagSuggest
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<zed::Command> {
        // Markdown files are open in every kind of project: only start for one that has the script.
        worktree
            .read_text_file(SCRIPT)
            .map_err(|_| format!("{SCRIPT} was not found in this project, so tag suggestions are off here"))?;

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![format!("{}/{}", worktree.root_path(), SCRIPT)],
            env: Vec::new(),
        })
    }
}

zed::register_extension!(TagSuggest);
