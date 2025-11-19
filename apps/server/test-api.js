// 测试 Express API
const BASE_URL = "http://localhost:3000";

async function testAPI() {
  console.log("🧪 开始测试 API...\n");

  try {
    // 1. 健康检查
    console.log("1️⃣ 测试健康检查接口");
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log("✅ 健康检查:", healthData);
    console.log("");

    // 2. 获取所有用户
    console.log("2️⃣ 获取所有用户");
    const usersRes = await fetch(`${BASE_URL}/api/users`);
    const usersData = await usersRes.json();
    console.log("✅ 所有用户:", usersData);
    console.log("");

    // 3. 获取单个用户
    console.log("3️⃣ 获取单个用户 (ID: 1)");
    const userRes = await fetch(`${BASE_URL}/api/users/1`);
    const userData = await userRes.json();
    console.log("✅ 用户详情:", userData);
    console.log("");

    // 4. 创建新用户
    console.log("4️⃣ 创建新用户");
    const createRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Charlie",
        email: "charlie@example.com",
      }),
    });
    const createData = await createRes.json();
    console.log("✅ 创建用户:", createData);
    console.log("");

    // 5. 更新用户
    console.log("5️⃣ 更新用户 (ID: 1)");
    const updateRes = await fetch(`${BASE_URL}/api/users/1`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Alice Updated",
        email: "alice.updated@example.com",
      }),
    });
    const updateData = await updateRes.json();
    console.log("✅ 更新用户:", updateData);
    console.log("");

    // 6. 获取更新后的所有用户
    console.log("6️⃣ 获取更新后的所有用户");
    const updatedUsersRes = await fetch(`${BASE_URL}/api/users`);
    const updatedUsersData = await updatedUsersRes.json();
    console.log("✅ 所有用户:", updatedUsersData);
    console.log("");

    // 7. 删除用户
    console.log("7️⃣ 删除用户 (ID: 2)");
    const deleteRes = await fetch(`${BASE_URL}/api/users/2`, {
      method: "DELETE",
    });
    const deleteData = await deleteRes.json();
    console.log("✅ 删除用户:", deleteData);
    console.log("");

    // 8. 测试错误处理 - 获取不存在的用户
    console.log("8️⃣ 测试错误处理 - 获取不存在的用户 (ID: 999)");
    const notFoundRes = await fetch(`${BASE_URL}/api/users/999`);
    const notFoundData = await notFoundRes.json();
    console.log("✅ 错误响应:", notFoundData);
    console.log("");

    // 9. 测试验证 - 创建缺少字段的用户
    console.log("9️⃣ 测试验证 - 创建缺少字段的用户");
    const validationRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test",
      }),
    });
    const validationData = await validationRes.json();
    console.log("✅ 验证错误:", validationData);
    console.log("");

    console.log("🎉 所有测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testAPI();
