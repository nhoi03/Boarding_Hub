"""Generate MySQL 8 DDL (Flyway V1) from boardinghub.dbml.

Usage: python tools/dbml_to_mysql.py boardinghub.dbml migrations/V1__schema.sql
Requires: pip install pydbml
"""
import hashlib
import sys

from pydbml import PyDBML
from pydbml.classes import Enum, Expression

MAX_IDENT = 64


def q(text):
    return "'" + str(text).replace("\\", "\\\\").replace("'", "''") + "'"


def ident(name):
    if len(name) <= MAX_IDENT:
        return name
    digest = hashlib.sha1(name.encode()).hexdigest()[:8]
    return name[: MAX_IDENT - 9] + "_" + digest


def one_line(note, limit):
    text = " ".join(str(note.text if hasattr(note, "text") else note).split())
    return text[:limit]


def column_type(col):
    if isinstance(col.type, Enum):
        return "ENUM(" + ", ".join(q(item.name) for item in col.type.items) + ")"
    return str(col.type).upper().replace("BOOLEAN", "TINYINT(1)")


def column_default(col):
    value = col.default
    if value is None:
        return ""
    if isinstance(value, Expression):
        return " DEFAULT " + value.text
    if isinstance(value, bool):
        return " DEFAULT " + ("1" if value else "0")
    if isinstance(value, (int, float)):
        return " DEFAULT " + str(value)
    return " DEFAULT " + q(value)


def render_column(col):
    parts = ["  `%s` %s" % (col.name, column_type(col))]
    parts.append(" NOT NULL" if (col.not_null or col.pk) else " NULL")
    if col.autoinc:
        parts.append(" AUTO_INCREMENT")
    parts.append(column_default(col))
    if col.name == "updated_at":
        parts.append(" ON UPDATE CURRENT_TIMESTAMP(6)")
    if col.note and col.note.text:
        parts.append(" COMMENT " + q(one_line(col.note, 1000)))
    return "".join(parts)


def render_table(table):
    lines = [render_column(c) for c in table.columns]
    pk_cols = [c.name for c in table.columns if c.pk]
    lines.append("  PRIMARY KEY (%s)" % ", ".join("`%s`" % c for c in pk_cols))
    for col in table.columns:
        if col.unique and not col.pk:
            lines.append("  UNIQUE KEY `%s` (`%s`)" % (ident("uq_%s_%s" % (table.name, col.name)), col.name))
    for idx in table.indexes:
        if idx.pk:
            continue
        cols = ", ".join("`%s`" % s.name for s in idx.subjects)
        name = idx.name or ident("idx_%s_%s" % (table.name, "_".join(s.name for s in idx.subjects)))
        kind = "UNIQUE KEY" if idx.unique else "KEY"
        lines.append("  %s `%s` (%s)" % (kind, ident(name), cols))
    comment = ""
    if table.note and table.note.text:
        comment = " COMMENT=" + q(one_line(table.note, 2000))
    return "CREATE TABLE `%s` (\n%s\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci%s;\n" % (
        table.name,
        ",\n".join(lines),
        comment,
    )


def render_ref(ref):
    if ref.type == "<":
        child_cols, parent_cols = ref.col2, ref.col1
    else:
        child_cols, parent_cols = ref.col1, ref.col2
    child = child_cols[0].table.name
    parent = parent_cols[0].table.name
    name = ident("fk_%s_%s" % (child, "_".join(c.name for c in child_cols)))
    on_delete = (ref.on_delete or "restrict").upper()
    on_update = (ref.on_update or "restrict").upper()
    return "ALTER TABLE `%s` ADD CONSTRAINT `%s` FOREIGN KEY (%s) REFERENCES `%s` (%s) ON DELETE %s ON UPDATE %s;" % (
        child,
        name,
        ", ".join("`%s`" % c.name for c in child_cols),
        parent,
        ", ".join("`%s`" % c.name for c in parent_cols),
        on_delete,
        on_update,
    )


def main(src, dst):
    # pydbml does not know the optional-ref operator `>?`; nullability already comes from the column.
    db = PyDBML(open(src, encoding="utf-8").read().replace("ref: >? ", "ref: > "))
    out = [
        "-- BoardingHub V1: schema generated from boardinghub.dbml by tools/dbml_to_mysql.py. Do not edit by hand.",
        "-- MySQL 8.0+, InnoDB, utf8mb4.",
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "",
    ]
    for table in db.tables:
        out.append(render_table(table))
    out.append("-- Foreign keys")
    out.extend(render_ref(ref) for ref in db.refs)
    out.append("")
    out.append("SET FOREIGN_KEY_CHECKS = 1;")
    open(dst, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("tables=%d foreign_keys=%d -> %s" % (len(db.tables), len(db.refs), dst))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
