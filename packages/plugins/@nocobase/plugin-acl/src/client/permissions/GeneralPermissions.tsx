import { onFormValuesChange, createForm, Form } from '@formily/core';
import { connect } from '@formily/react';
import { SchemaComponent, useAPIClient, useRequest } from '@nocobase/client';
import { Checkbox, message } from 'antd';
import uniq from 'lodash/uniq';
import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RolesManagerContext } from '../RolesManagerProvider';
import { StrategyActions } from './StrategyActions';
import { useACLTranslation } from '../locale';
import { uid } from '@formily/shared';
import { useMemoizedFn } from 'ahooks';

const SnippetCheckboxGroup = connect((props) => {
  const { t } = useTranslation();
  return (
    <Checkbox.Group
      style={{
        width: '100%',
        display: 'block',
      }}
      value={props.value}
      onChange={(values) => {
        const snippets = ['ui.*', 'pm', 'pm.*', 'app'];
        const disallowSnippets = snippets.map((key) => `!${key}`);
        const value = uniq([...(props.value || []), ...values])
          .filter((key) => key && !disallowSnippets.includes(key))
          .map((key) => {
            if (!snippets.includes(key) || values?.includes(key)) {
              return key;
            }
            return `!${key}`;
          });
        for (const key of snippets) {
          if (!value.includes(key) && !value.includes(`!${key}`)) {
            value.push(`!${key}`);
          }
        }
        props.onChange(value);
      }}
    >
      <div style={{ marginTop: 16 }}>
        <Checkbox value="ui.*">{t('Allows to configure interface')}</Checkbox>
      </div>
      <div style={{ marginTop: 8 }}>
        <Checkbox value="pm">{t('Allows to install, activate, disable plugins')}</Checkbox>
      </div>
      <div style={{ marginTop: 8 }}>
        <Checkbox value="pm.*">{t('Allows to configure plugins')}</Checkbox>
      </div>
      <div style={{ marginTop: 8 }}>
        <Checkbox value="app">{t('Allows to clear cache, reboot application')}</Checkbox>
      </div>
    </Checkbox.Group>
  );
});

export const GeneralPermissions: React.FC<{
  active: boolean;
}> = ({ active }) => {
  const { role, setRole } = useContext(RolesManagerContext);
  const { t } = useACLTranslation();
  const api = useAPIClient();
  const { data } = useRequest(
    () =>
      api
        .resource('roles')
        .get({
          filterByTk: role?.name,
        })
        .then((res) => {
          const record = res?.data?.data;
          record.snippets?.forEach((key: string) => {
            record[key] = true;
          });
          return record;
        }),
    {
      ready: active,
      refreshDeps: [role?.name],
    },
  );
  const update = useMemoizedFn(async (form: Form) => {
    await api.resource('roles').update({
      filterByTk: role.name,
      values: form.values,
    });
    setRole({ ...role, ...form.values });
    message.success(t('Saved successfully'));
  });
  const form = useMemo(() => {
    return createForm({
      values: data,
      effects() {
        onFormValuesChange(async (form) => {
          await update(form);
        });
      },
    });
  }, [data, update]);

  return (
    <SchemaComponent
      components={{ SnippetCheckboxGroup, StrategyActions }}
      schema={{
        type: 'void',
        name: uid(),
        'x-component': 'FormV2',
        'x-component-props': {
          form,
        },
        properties: {
          snippets: {
            title: t('Configure permissions'),
            type: 'boolean',
            'x-decorator': 'FormItem',
            'x-component': 'SnippetCheckboxGroup',
          },
          allowNewMenu: {
            title: t('Menu permissions'),
            'x-decorator': 'FormItem',
            'x-component': 'Checkbox',
            'x-content': t('New menu items are allowed to be accessed by default.'),
          },
        },
      }}
    />
  );
};
