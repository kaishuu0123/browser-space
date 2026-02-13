import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Profile } from '../../../shared/types'
import { Button } from './ui/button'

interface SortableProfileItemProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onDelete: (profile: Profile) => void
  onShowDataPath: (profile: Profile) => void
  onClearData: (profile: Profile) => void
}

function SortableProfileItem({
  profile,
  onEdit,
  onDelete,
  onShowDataPath,
  onClearData,
}: SortableProfileItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: profile.id,
  })
  const [customIconPath, setCustomIconPath] = useState<string | null>(null)

  useEffect(() => {
    if (profile.icon === 'custom' && profile.customIconPath) {
      window.iconApi.getPath(profile.customIconPath).then(setCustomIconPath)
    }
  }, [profile.icon, profile.customIconPath])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
        title="Drag to reorder"
      >
        <span className="codicon codicon-gripper text-gray-400" />
      </button>

      {/* Icon */}
      {profile.icon === 'custom' && customIconPath ? (
        <img
          src={`file://${customIconPath}`}
          alt={profile.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <span
          className={`codicon codicon-${profile.icon || 'circle-large-outline'} !text-2xl flex-shrink-0`}
          style={{ color: profile.iconColor }}
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{profile.name}</p>
        <p className="text-sm text-gray-500 truncate">{profile.homeUrl}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShowDataPath(profile)}
          title="Show data path"
        >
          <span className="codicon codicon-folder" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onClearData(profile)} title="Clear data">
          <span className="codicon codicon-clear-all" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(profile)} title="Edit">
          <span className="codicon codicon-edit" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(profile)} title="Delete">
          <span className="codicon codicon-trash text-red-600" />
        </Button>
      </div>
    </div>
  )
}

interface SortableProfileListProps {
  profiles: Profile[]
  onReorder: (profiles: Profile[]) => void
  onEdit: (profile: Profile) => void
  onDelete: (profile: Profile) => void
  onShowDataPath: (profile: Profile) => void
  onClearData: (profile: Profile) => void
}

export function SortableProfileList({
  profiles,
  onReorder,
  onEdit,
  onDelete,
  onShowDataPath,
  onClearData,
}: SortableProfileListProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = profiles.findIndex((p) => p.id === active.id)
      const newIndex = profiles.findIndex((p) => p.id === over.id)

      const reorderedProfiles = arrayMove(profiles, oldIndex, newIndex)
      onReorder(reorderedProfiles)
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No profiles yet.</p>
        <p className="text-sm mt-2">Click the button above to create your first profile.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={profiles.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <SortableProfileItem
              key={profile.id}
              profile={profile}
              onEdit={onEdit}
              onDelete={onDelete}
              onShowDataPath={onShowDataPath}
              onClearData={onClearData}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
