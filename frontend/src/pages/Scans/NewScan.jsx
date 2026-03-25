import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Formik, Form, Field, FieldArray } from 'formik'
import * as Yup from 'yup'
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-toastify'
import { scansApi } from '../../services/api'
import ModuleSelector from '../../components/Scans/ModuleSelector'
import AdvancedOptions from '../../components/Scans/AdvancedOptions'

const scanSchema = Yup.object().shape({
  target: Yup.string()
    .required('Target is required')
    .matches(
      /^([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3}|([0-9a-fA-F:]+))$/,
      'Invalid domain or IP address'
    ),
  modules: Yup.array()
    .min(1, 'Select at least one module')
    .required(),
  options: Yup.object().shape({
    aggressive: Yup.boolean(),
    enumerateUsers: Yup.boolean(),
    portScan: Yup.boolean(),
    timeout: Yup.number().min(10).max(300),
  }),
  schedule: Yup.object().shape({
    enabled: Yup.boolean(),
    frequency: Yup.string().when('enabled', {
      is: true,
      then: Yup.string().required()
    }),
    time: Yup.string().when('enabled', {
      is: true,
      then: Yup.string().required()
    })
  })
})

const NewScan = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('basic')

  const createScan = useMutation({
    mutationFn: scansApi.create,
    onSuccess: (data) => {
      toast.success('Scan started successfully!')
      navigate(`/scans/${data.scan_id}`)
    },
    onError: (error) => {
      toast.error(`Failed to start scan: ${error.message}`)
    }
  })

  const initialValues = {
    target: '',
    modules: ['dns', 'whois', 'crtsh'],
    options: {
      aggressive: false,
      enumerateUsers: false,
      portScan: false,
      timeout: 30,
    },
    schedule: {
      enabled: false,
      frequency: 'daily',
      time: '02:00',
    }
  }

  const availableModules = [
    { id: 'dns', name: 'DNS Enumeration', icon: GlobeAltIcon, description: 'DNS records and subdomain discovery' },
    { id: 'whois', name: 'WHOIS Lookup', icon: DocumentTextIcon, description: 'Domain registration information' },
    { id: 'crtsh', name: 'Certificate Transparency', icon: ShieldCheckIcon, description: 'SSL certificate analysis' },
    { id: 'shodan', name: 'Shodan', icon: GlobeAltIcon, description: 'Internet-facing asset discovery' },
    { id: 'virustotal', name: 'VirusTotal', icon: ShieldCheckIcon, description: 'Threat intelligence and reputation' },
    { id: 'wordpress', name: 'WordPress Security', icon: CodeBracketIcon, description: 'WordPress-specific assessment' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          New OSINT Scan
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure and launch a new reconnaissance scan
        </p>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={scanSchema}
        onSubmit={(values) => {
          createScan.mutate(values)
        }}
      >
        {({ values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center space-x-4 mb-8">
              <StepIndicator 
                number={1} 
                title="Target" 
                active={activeTab === 'basic'} 
                completed={values.target && !errors.target}
              />
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <StepIndicator 
                number={2} 
                title="Modules" 
                active={activeTab === 'modules'} 
                completed={values.modules.length > 0}
              />
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <StepIndicator 
                number={3} 
                title="Options" 
                active={activeTab === 'options'} 
              />
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              {activeTab === 'basic' && (
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Domain or IP
                    </label>
                    <Field
                      name="target"
                      type="text"
                      placeholder="example.com or 192.168.1.1"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.target && touched.target && (
                      <p className="mt-1 text-sm text-red-600">{errors.target}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('modules')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Next: Select Modules
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'modules' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Select OSINT Modules
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableModules.map((module) => (
                      <ModuleCard
                        key={module.id}
                        module={module}
                        selected={values.modules.includes(module.id)}
                        onClick={() => {
                          const newModules = values.modules.includes(module.id)
                            ? values.modules.filter(m => m !== module.id)
                            : [...values.modules, module.id]
                          setFieldValue('modules', newModules)
                        }}
                      />
                    ))}
                  </div>

                  {errors.modules && (
                    <p className="mt-4 text-sm text-red-600">{errors.modules}</p>
                  )}

                  <div className="flex justify-between mt-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('basic')}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-6 py-2"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('options')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Next: Configure Options
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'options' && (
                <div className="p-6 space-y-6">
                  <AdvancedOptions values={values} setFieldValue={setFieldValue} />
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Scheduling (Optional)
                    </h4>
                    <div className="flex items-center space-x-4">
                      <Field
                        type="checkbox"
                        name="schedule.enabled"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enable recurring scan
                      </span>
                    </div>
                    
                    {values.schedule.enabled && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Frequency
                          </label>
                          <Field
                            as="select"
                            name="schedule.frequency"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </Field>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Time
                          </label>
                          <Field
                            type="time"
                            name="schedule.time"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('modules')}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-6 py-2"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={createScan.isPending}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium flex items-center space-x-2"
                    >
                      {createScan.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          <span>Starting Scan...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-5 h-5" />
                          <span>Launch Scan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

// Helper Components
const StepIndicator = ({ number, title, active, completed }) => (
  <div className={`flex items-center space-x-2 ${active ? 'text-blue-600' : completed ? 'text-green-600' : 'text-gray-400'}`}>
    <div className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
      ${active ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 
        completed ? 'bg-green-100 dark:bg-green-900 text-green-600' : 
        'bg-gray-100 dark:bg-gray-800 text-gray-500'}
    `}>
      {completed ? '✓' : number}
    </div>
    <span className="text-sm font-medium hidden sm:block">{title}</span>
  </div>
)

const ModuleCard = ({ module, selected, onClick }) => {
  const Icon = module.icon
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-2 cursor-pointer transition-all
        ${selected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${selected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${selected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
            {module.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {module.description}
          </p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewScan
