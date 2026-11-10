import { useState } from 'react'
import { CourseCatalog } from '../components/CourseCatalog'
import { useAula } from '../context/AulaContext'
import { useCourseManager } from '../hooks/useCourseManager'

export function CoursesPage() {
  const { role, courses, materials, canCreateCourse, canManageContent, openCourse } = useAula()
  const mgr = useCourseManager()
  const [search, setSearch] = useState('')
  const filteredCourses = courses.filter(c => `${c.nombre} ${c.codigo}`.toLowerCase().includes(search.toLowerCase()))
  return <>
            <CourseCatalog overline="CATÁLOGO PERSONAL" title="Tus capacitaciones" courses={filteredCourses} materials={materials} search={search} setSearch={setSearch} role={role} canCreate={canCreateCourse} onCreate={mgr.openCreate} canUpload={canManageContent} onUpload={() => mgr.openUpload()} onOpenCourse={openCourse} onEditCourse={mgr.openEdit} onDeleteCourse={mgr.remove}/>
    {mgr.modals}
  </>
}
