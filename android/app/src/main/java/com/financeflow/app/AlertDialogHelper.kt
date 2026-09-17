package com.financeflow.app

import android.app.AlertDialog
import android.content.Context

object AlertDialogHelper {
    fun confirm(context: Context, title: String, message: String, onYes: () -> Unit) {
        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Import") { _, _ -> onYes() }
            .show()
    }
}
