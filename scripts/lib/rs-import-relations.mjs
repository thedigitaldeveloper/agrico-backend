/** Preserve related document identity while correcting published roots linked to draft rows. */
export async function normalizePublishedRelations({ db, inventory, modelTables, apply = false }) {
  const quote = value => '`' + String(value).replaceAll('`', '``') + '`';
  const tables = new Set(modelTables);
  const report = [];
  for (const table of new Set(inventory.source.foreignKeys.map(key => key.tableName))) {
    if (!table.endsWith('_lnk')) continue;
    const keys = inventory.source.foreignKeys.filter(key => key.tableName === table);
    const owner = keys.find(key => table.startsWith(key.targetTable + '_'));
    if (!owner || !tables.has(owner.targetTable)) continue;
    const rootColumns = inventory.target.columns.filter(column => column.tableName === owner.targetTable).map(column => column.name);
    if (!rootColumns.includes('published_at') || !rootColumns.includes('document_id')) continue;
    for (const target of keys.filter(key => key !== owner && tables.has(key.targetTable))) {
      const targetColumns = inventory.target.columns.filter(column => column.tableName === target.targetTable).map(column => column.name);
      if (!targetColumns.includes('published_at') || !targetColumns.includes('document_id')) continue;
      const query = `SELECT link.id AS linkId, link.${quote(owner.columnName)} AS ownerId, link.${quote(target.columnName)} AS oldId, current.id AS newId, draft.document_id AS documentId FROM ${quote(table)} link JOIN ${quote(owner.targetTable)} parent ON parent.id=link.${quote(owner.columnName)} JOIN ${quote(target.targetTable)} draft ON draft.id=link.${quote(target.columnName)} JOIN ${quote(target.targetTable)} current ON current.document_id=draft.document_id AND current.published_at IS NOT NULL WHERE parent.published_at IS NOT NULL AND draft.published_at IS NULL AND EXISTS (SELECT 1 FROM rs_catalogue_import_map ledger WHERE ledger.source_table=? AND ledger.target_id=parent.id)`;
      const [rows] = await db.query(query, [owner.targetTable]);
      if (new Set(rows.map(row => row.linkId)).size !== rows.length) throw new Error('Ambiguous published document version in ' + table);
      let duplicateVersions = 0;
      for (const row of rows) {
        const [alreadyPublished] = await db.query(`SELECT id FROM ${quote(table)} WHERE ${quote(owner.columnName)}=? AND ${quote(target.columnName)}=?`, [row.ownerId, row.newId]);
        if (alreadyPublished.length > 1) throw new Error('Ambiguous duplicate published link in ' + table);
        if (alreadyPublished.length) duplicateVersions++;
        if (apply) {
          // A source relation may already link both versions of the same document.
          // Keep its published link, removing only the redundant draft-version link.
          const [result] = alreadyPublished.length
            ? await db.query(`DELETE FROM ${quote(table)} WHERE id=? AND ${quote(target.columnName)}=?`, [row.linkId, row.oldId])
            : await db.query(`UPDATE ${quote(table)} SET ${quote(target.columnName)}=? WHERE id=? AND ${quote(target.columnName)}=?`, [row.newId, row.linkId, row.oldId]);
          if (result.affectedRows !== 1) throw new Error('Concurrent relation edit detected in ' + table);
        }
      }
      report.push({ relation: table + '.' + target.columnName, owner: owner.targetTable, target: target.targetTable, corrected: rows.length, repointed: rows.length - duplicateVersions, redundantDraftLinks: duplicateVersions, sameDocumentOnly: true });
    }
  }
  return report;
}