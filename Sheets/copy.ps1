$sourceFile = "Salaries.xlsx"   # change to your source file name
$year = 2025

$months = @(
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
)

for ($i = 0; $i -lt 12; $i++) {
    $num = "{0:D2}" -f ($i + 1)
    $newName = "$num- $($months[$i]) Salaries $year.xlsx"
    Copy-Item $sourceFile $newName
}
