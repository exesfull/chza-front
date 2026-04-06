import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  GripVertical,
  Loader,
  CircleCheck,
  MoreVertical,
  Plus,
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface Task {
  id: number
  name: string
  sectionType: string
  status: "done" | "in-process"
  target: number
  limit: number
  reviewer: string
}

const initialTasks: Task[] = [
  {
    id: 1,
    name: "Cover page",
    sectionType: "Cover page",
    status: "in-process",
    target: 18,
    limit: 5,
    reviewer: "Eddie Lake",
  },
  {
    id: 2,
    name: "Table of contents",
    sectionType: "Table of contents",
    status: "done",
    target: 29,
    limit: 24,
    reviewer: "Eddie Lake",
  },
  {
    id: 3,
    name: "Executive summary",
    sectionType: "Narrative",
    status: "done",
    target: 10,
    limit: 13,
    reviewer: "Eddie Lake",
  },
  {
    id: 4,
    name: "Technical approach",
    sectionType: "Narrative",
    status: "done",
    target: 27,
    limit: 23,
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 5,
    name: "Design",
    sectionType: "Narrative",
    status: "in-process",
    target: 2,
    limit: 16,
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 6,
    name: "Capabilities",
    sectionType: "Narrative",
    status: "in-process",
    target: 20,
    limit: 8,
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 7,
    name: "Integration with existing systems",
    sectionType: "Narrative",
    status: "in-process",
    target: 19,
    limit: 21,
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 8,
    name: "Innovation and Advantages",
    sectionType: "Narrative",
    status: "done",
    target: 25,
    limit: 26,
    reviewer: "",
  },
  {
    id: 9,
    name: "Overview of EMR's Innovative Solutions",
    sectionType: "Technical content",
    status: "done",
    target: 7,
    limit: 23,
    reviewer: "",
  },
  {
    id: 10,
    name: "Advanced Algorithms and Machine Learning",
    sectionType: "Narrative",
    status: "done",
    target: 30,
    limit: 28,
    reviewer: "",
  },
]

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const totalPages = Math.ceil(tasks.length / rowsPerPage)
  const paginatedTasks = tasks.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedTasks.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(paginatedTasks.map((task) => task.id))
    }
  }

  const toggleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  const updateTask = (id: number, field: keyof Task, value: any) => {
    setTasks(
      tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task))
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg p-1 text-muted-foreground">
            <button className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground bg-background shadow-sm">
              Outline
            </button>
            <button className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground/60 hover:text-foreground">
              Past Performance{" "}
              <Badge variant="secondary" className="size-5 rounded-full px-1">
                3
              </Badge>
            </button>
            <button className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground/60 hover:text-foreground">
              Key Personnel{" "}
              <Badge variant="secondary" className="size-5 rounded-full px-1">
                2
              </Badge>
            </button>
            <button className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground/60 hover:text-foreground">
              Focus Documents
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <LayoutGrid className="size-4" />
            <span className="hidden lg:inline">Customize Columns</span>
            <span className="lg:hidden">Columns</span>
            <ChevronDown className="size-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            <span className="hidden lg:inline">Add Section</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-8">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={toggleSelectAll}
                      className="size-4 shrink-0 rounded border border-input shadow-xs transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label="Select all"
                    >
                      {selectedRows.length === paginatedTasks.length && (
                        <CircleCheck className="size-4 fill-primary text-primary-foreground" />
                      )}
                    </button>
                  </div>
                </TableHead>
                <TableHead>Header</TableHead>
                <TableHead>Section Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.map((task) => (
                <TableRow key={task.id} data-state={selectedRows.includes(task.id) ? "selected" : undefined}>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                      <GripVertical className="size-3" />
                      <span className="sr-only">Drag to reorder</span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleSelectRow(task.id)}
                        className="size-4 shrink-0 rounded border border-input shadow-xs transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label="Select row"
                      >
                        {selectedRows.includes(task.id) && (
                          <CircleCheck className="size-4 fill-primary text-primary-foreground" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="link" className="h-auto p-0 text-left font-medium">
                      {task.name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="w-32">
                      <Badge variant="outline" className="text-muted-foreground">
                        {task.sectionType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground">
                      {task.status === "done" ? (
                        <>
                          <CircleCheck className="size-3 fill-green-500 dark:fill-green-400" />
                          Done
                        </>
                      ) : (
                        <>
                          <Loader className="size-3" />
                          In Process
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form>
                      <Input
                        id={`${task.id}-target`}
                        type="number"
                        value={task.target}
                        onChange={(e) =>
                          updateTask(task.id, "target", parseInt(e.target.value))
                        }
                        className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:bg-background"
                      />
                    </form>
                  </TableCell>
                  <TableCell>
                    <form>
                      <Input
                        id={`${task.id}-limit`}
                        type="number"
                        value={task.limit}
                        onChange={(e) =>
                          updateTask(task.id, "limit", parseInt(e.target.value))
                        }
                        className="h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:bg-background"
                      />
                    </form>
                  </TableCell>
                  <TableCell>
                    {task.reviewer || (
                      <select className="flex h-8 w-38 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                        <option value="">Assign reviewer</option>
                        <option value="Eddie Lake">Eddie Lake</option>
                        <option value="Jamik Tashpulatov">Jamik Tashpulatov</option>
                      </select>
                    )}
                    {task.reviewer && <span className="text-sm">{task.reviewer}</span>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {selectedRows.length} of {tasks.length} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </label>
            <select
              id="rows-per-page"
              className="flex h-8 w-20 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft className="size-4" />
              <span className="sr-only">Go to first page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Go to previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Go to next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              <ChevronsRight className="size-4" />
              <span className="sr-only">Go to last page</span>
            </Button>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
