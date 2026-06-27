"""
Step 2: Remove the EntityListPage wrapper (was erroneously added)
The page already has EntityListPage for the question list internally.
Keep EntityPageHeader as the standalone header.
"""
filepath = "client/web/src/pages/QuestionBankPage.tsx"

with open(filepath, "rb") as f:
    content = f.read()

orig_O = content.count(b'{')
orig_C = content.count(b'}')
print(f"Before: O={orig_O} C={orig_C} D={orig_O-orig_C}")

# Remove the outer EntityListPage wrapper
# Find: "  return (\r\n    <EntityListPage<{ _id: string }>..."
old_return_open = (
    b"  return (\r\n"
    b"    <EntityListPage<{ _id: string }>\r\n"
    b"      mode=\"teacher\"\r\n"
    b"      title=\"\"\r\n"
    b"      subtitle=\"\"\r\n"
    b"      rows={[]}\r\n"
    b"      columns={[{ key: '_id', header: '' }]}\r\n"
    b"      rowKey={(r) => r._id}\r\n"
    b"      pagination={{ page: 1, pages: 1 }}\r\n"
    b"      onSearch={() => {}}\r\n"
    b"      onPageChange={() => {}}\r\n"
    b"      searchPlaceholder=\"\"\r\n"
    b"      loading={false}\r\n"
    b"      error={null}\r\n"
    b"      headerExtra={null}\r\n"
    b"    >\r\n"
    b"      <div className={styles.container}>"
)
assert old_return_open in content, "Return wrapper not found"
new_return_open = b"  return (\r\n    <div className={styles.container}>"
content = content.replace(old_return_open, new_return_open, 1)
O = content.count(b'{'); C = content.count(b'}')
print(f"After wrapper removal: O={O} C={C} D={O-C}")

# Remove the closing EntityListPage tag
old_close = b"\r\n    </div>\r\n    </EntityListPage>\r\n  );"
new_close = b"\r\n    </div>\r\n  );"
assert old_close in content, "Close wrapper not found"
content = content.replace(old_close, new_close, 1)
O = content.count(b'{'); C = content.count(b'}')
print(f"After close removal: O={O} C={C} D={O-C}")

with open(filepath, "wb") as f:
    f.write(content)
print(f"\nWritten. Final: O={content.count(b'{')} C={content.count(b'}')}")
