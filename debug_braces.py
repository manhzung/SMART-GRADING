import re

filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

def check_balance(name, c):
    o = c.count(b'{')
    cl = c.count(b'}')
    print(f"  {name}: opens={o}, closes={cl}, diff={o-cl}")

print("=== Initial ===")
check_balance("Initial", content)

# Step 1
old_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\n\r\n// "
new_import = b"import EntityListPage, { type Column } from '../presentation/components/shared/EntityListPage';\r\nimport EntityPageHeader from '../presentation/components/shared/EntityPageHeader';\r\n\r\n// "
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    check_balance("After Step 1 (import)", content)

# Step 2: Replace header div
marker_end = b"      </div>\r\n\r\n      {/* "
header_start_marker = b"<div className={styles.header}>"
if header_start_marker in content and marker_end in content:
    start_idx = content.index(header_start_marker)
    end_idx = content.index(marker_end) + len(marker_end)
    old_header = content[start_idx:end_idx]
    o = old_header.count(b'{')
    cl = old_header.count(b'}')
    print(f"  Old header: opens={o}, closes={cl}, diff={o-cl}")
    
    new_header = b"""      <EntityPageHeader
        mode="teacher"
        title="Question Bank"
        subtitle="Create, manage, and filter academic questions and equations"
        extraActions={
          canManage ? (
            <>
              <button className={styles.createBtn} style={{ backgroundColor: '#7c3aed' }} onClick={() => setIsAiModalOpen(true)}>
                <Sparkles size={18} />
                <span>T\xe1\xba\xa1o b\xe1\xba\xebng AI</span>
              </button>
              <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} />
                <span>Add Question</span>
              </button>
            </>
          ) : undefined
        }
      />

"""
    o = new_header.count(b'{')
    cl = new_header.count(b'}')
    print(f"  New header: opens={o}, closes={cl}, diff={o-cl}")
    
    content = content[:start_idx] + new_header + content[end_idx:]
    check_balance("After Step 2 (header)", content)

# Step 3: Wrap outer container
old_return_open = b"  return (\r\n    <div className={styles.container}>"
new_return_open = b"""  return (
    <EntityListPage<{ _id: string }>
      mode="teacher"
      title=""
      subtitle=""
      rows={[]}
      columns={[{ key: '_id', header: '' }]}
      rowKey={(r) => r._id}
      pagination={{ page: 1, pages: 1 }}
      onSearch={() => {}}
      onPageChange={() => {}}
      searchPlaceholder=""
      loading={false}
      error={null}
      headerExtra={null}
    >
      <div className={styles.container}>"""

o_new = new_return_open.count(b'{')
cl_new = new_return_open.count(b'}')
print(f"  New return open: opens={o_new}, closes={cl_new}, diff={o_new-cl_new}")

content = content.replace(old_return_open, new_return_open, 1)
check_balance("After Step 3 (wrap container)", content)

# Step 4: Close EntityListPage
old_rc = b"\r\n    </div>\r\n  );"
new_rc = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"

o_old = old_rc.count(b'{')
cl_old = old_rc.count(b'}')
o_new = new_rc.count(b'{')
cl_new = new_rc.count(b'}')
print(f"  Old close: opens={o_old}, closes={cl_old}")
print(f"  New close: opens={o_new}, closes={cl_new}")

last_idx = content.rfind(old_rc)
content = content[:last_idx] + new_rc + content[last_idx + len(old_rc):]
check_balance("After Step 4 (close)", content)

# Step 5: Remove unused
unused = b"\r\ninterface QuestionRow { _id: string; text: string; difficulty: string; type: string; tags?: string[]; schoolName?: string; }\r\n\r\nconst questionColumns: Column<QuestionRow>[] = [\r\n  { key: 'text', header: 'N\xe1\xbb\x99i dung', render: (r) => r.text.slice(0, 80) },\r\n  { key: 'difficulty', header: '\xc4\x90\xe1\xbb\x99 kh\xc3\xb3' },\r\n  { key: 'tags', header: 'Tags', render: (r) => (r.tags ?? []).join(', ') },\r\n];\r\n"
if unused in content:
    o = unused.count(b'{')
    cl = unused.count(b'}')
    print(f"  Unused block: opens={o}, closes={cl}, diff={o-cl}")
    content = content.replace(unused, b"\r\n")
    check_balance("After Step 5 (remove unused)", content)

print(f"\nFinal: {content.count(chr(123))}/{content.count(chr(125))} = {content.count(chr(123)) - content.count(chr(125))}")
