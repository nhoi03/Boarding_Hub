"""Build a display-only DBML for dbdiagram.io from the canonical boardinghub.dbml.

- Hides actor/tenant refs (`*_by -> users.id`, `organization_id -> organizations.id`) outside the
  account/organization groups; the SQL schema keeps them as real foreign keys.
- Colors each TableGroup and the header of every table in it (paid feature on dbdiagram).
- Puts every table in a schema named after its group (ep07_billing.invoices) so the free
  "Diagram Views > Group by: Schema" panel can show or hide one business flow at a time.

Usage: python tools/make_diagram_dbml.py boardinghub.dbml boardinghub_diagram.dbml
"""
import re
import sys

GROUP_COLORS = {
    "EP01_Accounts": "#475569",
    "EP02_Properties": "#0F766E",
    "EP03_EP04_Contracts": "#1D4ED8",
    "EP05_Handover": "#0369A1",
    "EP06_Utilities": "#CA8A04",
    "EP07_Billing": "#B91C1C",
    "EP08_Checkout": "#C2410C",
    "EP09_Maintenance_Disputes": "#7C3AED",
    "EP10_PersonDays": "#DB2777",
    "EP11_RoomFund": "#15803D",
    "EP12_Files_Residence": "#4D7C0F",
    "EP13_Listings": "#0891B2",
    "EP14_Operations": "#9333EA",
    "EP15_Audit_Backup": "#334155",
}
KEEP_REFS_FROM_GROUPS = {"EP01_Accounts", "EP02_Properties"}
KEEP_REFS = {("persons", "user_id")}
HIDDEN_TARGETS = ("users.id", "organizations.id")

NOTE = (
    "\n  Bản hiển thị: ẩn đường nối từ cột người thao tác (*_by -> users) và organization_id"
    " ngoài nhóm EP01/EP02 cho dễ nhìn. Trong SQL chúng vẫn là khóa ngoại."
    " File chuẩn: boardinghub.dbml.\n"
)


def table_groups(src):
    owner = {}
    for m in re.finditer(r"^TableGroup (\w+) \{([^}]*)\}", src, re.M):
        for t in m.group(2).split():
            owner[t] = m.group(1)
    return owner


def strip_ref(settings):
    parts = [p.strip() for p in re.split(r",(?=(?:[^']*'[^']*')*[^']*$)", settings)]
    kept = [p for p in parts if not (p.startswith("ref:") and p.endswith(HIDDEN_TARGETS))]
    return ", ".join(kept)


def add_schemas(text, owner):
    schema = {t: g.lower() for t, g in owner.items()}
    text = re.sub(r"^Table (\w+)", lambda m: f"Table {schema.get(m.group(1), 'public')}.{m.group(1)}", text, flags=re.M)
    text = re.sub(r"(ref: [>-]\??) (\w+)\.(\w+)", lambda m: f"{m.group(1)} {schema.get(m.group(2), 'public')}.{m.group(2)}.{m.group(3)}", text)

    def qualify_group(m):
        body = re.sub(r"^  (\w+)$", lambda t: f"  {schema.get(t.group(1), 'public')}.{t.group(1)}", m.group(2), flags=re.M)
        return m.group(1) + body + "}"

    return re.sub(r"^(TableGroup [^\n]*\{)([^}]*)\}", qualify_group, text, flags=re.M)


def main(src_path, out_path):
    src = open(src_path, encoding="utf-8").read()
    owner = table_groups(src)
    out, table, hidden = [], None, 0

    for line in src.split("\n"):
        m = re.match(r"^Table (\w+) \{", line)
        if m:
            table = m.group(1)
            color = GROUP_COLORS.get(owner.get(table))
            if color:
                line = f"Table {table} [headercolor: {color}] {{"
        elif line.startswith("}"):
            table = None

        cm = re.match(r"^(  (\w+) [^\[]+?)\s*\[(.*)\]\s*$", line)
        if (table and cm and owner.get(table) not in KEEP_REFS_FROM_GROUPS
                and (table, cm.group(2)) not in KEEP_REFS
                and re.search(r"ref: >\?? (users|organizations)\.id", cm.group(3))):
            settings = strip_ref(cm.group(3))
            line = f"{cm.group(1)} [{settings}]" if settings else cm.group(1)
            hidden += 1

        g = re.match(r"^TableGroup (\w+) \{", line)
        if g and g.group(1) in GROUP_COLORS:
            line = f"TableGroup {g.group(1)} [color: {GROUP_COLORS[g.group(1)]}] {{"

        out.append(line)

    text = "\n".join(out).replace("  Note: '''\n  Schema", "  Note: '''" + NOTE + "\n  Schema", 1)
    text = add_schemas(text, owner)
    open(out_path, "w", encoding="utf-8").write(text)
    print(f"hidden_refs={hidden} -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
