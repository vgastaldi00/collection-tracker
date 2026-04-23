document.getElementById("searchBtn").addEventListener("click", async () => {
  const term = document.getElementById("searchInput").value;

  try {
    const data = await window.api.searchLots(term);

    console.log("✅ RESULTADO:", data);

    document.getElementById("result").innerText = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});